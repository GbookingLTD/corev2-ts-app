import * as GBookingCoreV2 from 'corev2-schemata/langs/typescript/GBookingCoreV2';
import * as inquirer from 'inquirer';
import l10n from "../l10n/index";
import env from "../env";
import state from "./state";
import {MedMeAPI} from "corev2-ts-sdk/lib/api";
import {MedMeAPICracSlots} from "corev2-ts-sdk/lib/cracSlots";

const text = l10n[env.l10n];

export function handleError(err: any) {
    if (err.isRpcError)
        return console.error("rpc error %s %s", err.error.code, err.error.message);

    console.error("common error %s", err.message, err.stack);
}

/**
 * Стартовое меню:
 * - записаться на прием
 * - получение списка записей
 * - показать мои данные
 */
export function chooseStart(): Promise<void> {
    const questions = [
        {
            type: 'list',
            name: 'action',
            message: text.prompt_action,
            choices: [
                {name: text.prompt_choices_clinic, value: 'choose_clinic'},
                {name: text.prompt_choices_appointment_list, value: 'appointment_list'},
                {name: text.prompt_choices_person_data, value: 'person_data'},
            ]
        }
    ];

    return inquirer
        .prompt(questions)
        .then(startAnswers);
}

function startAnswers(answers): Promise<void> {
    switch (answers.action) {
        //case 'appointment_list':
        //    return getAppointmentList();
        //case 'person_data':
        //    return getPersonData();
        case 'choose_clinic':
            return chooseClinic();
        default:
            throw Error("unknown action " + answers.action);
    }
}

/**
 * Точка входа в процесс OTP авторизации.
 */
// function authOtpRequest(): Promise<void> {
//     const questions = [
//         {
//             type: 'input',
//             name: 'phone',
//             message: text.prompt_phone,
//         },
//     ];
//
//     return inquirer
//         .prompt(questions)
//         .then(sendOtpCode)
//         .then(authOtpConfirm);
// }

/**
 * Запрос на отправку OTP кода на номер телефона.
 */
// function sendOtpCode(answer): Promise<void> {
//
//     MedMeAPI.otpAuthorize.send();
// }

/**
 * Запрос на подтверждение OTP кода.
 */
function authOtpConfirm(): Promise<void> {
    const questions = [
        {
            type: 'input',
            name: 'code',
            message: text.prompt_otp_code,
        },
    ];

    return inquirer
        .prompt(questions)
        .then();
}

/**
 * Получение и отображение списка записей пользователя.
 */
// function getAppointmentList(): Promise<void> {
//
// }
/*
function getPersonData(): Promise<void> {

}
*/
/**
 * Выбор клиники для записи или перейти в меню ввода идентификатора клиники.
 */
export function chooseClinic(): Promise<void> {
    state.clear();
    let clinics;

    if (env.env === 'dev' || env.env === 'local')
        clinics = [
            {name: "Зубодёр СПб", value: {action:'get_business',businessId: 4000000003715}},
            {name: "Test Telemed", value: {action:'get_business',businessId: 4000000007261}},
            {name: "EHR Demo", value: {action:'get_business',businessId: 4000000006771}},
        ];
    else if (env.env === 'prod')
        clinics = [
            {name: "Клиника Семейная", value: {action:'get_network',networkId: 269}},
            {name: "Доктор Рядом", value: {action:'get_network',networkId: 220}},
            {name: "Медлайн-cервис", value: {action:'get_network',networkId: 222}},
            {name: "Med.me on Santa Anita St", value: {action:'get_business',businessId: 4000000006359}},
            {name: "Med.me Demo Network", value: {action:'get_network', networkId: 315}}
        ];

    const questions = [
        {
            type: 'list',
            name: 'action',
            message: text.prompt_action,
            choices: clinics.concat([
                {name: text.prompt_enter_id, value:{action:'choose_business_or_network'}}
            ])
        }
    ];

    return inquirer
        .prompt(questions)
        .then(chooseClinicAnswer);
}

function chooseClinicAnswer(answers) {
    switch (answers.action.action) {
        case 'get_business':
            return getBusinessByIdAction(Number(answers.action.businessId))
                .then((business: GBookingCoreV2.BusinessClass) =>
                    state.business = business)
                .then(chooseBusinessOptions)
                .catch(handleTtyError);
        case 'get_network':
            return getNetworkBusinessListAction(Number(answers.action.networkId))
                .then((businesses: GBookingCoreV2.BusinessRefInNetwork[]) =>
                    state.networkBusinesses = businesses)
                .catch(handleTtyError)
                .then(chooseClinicFromNetwork);
        case 'choose_business_or_network':
            return chooseBusinessOrNetwork();
        default:
            throw Error("unknown action " + answers.action.action);
    }
}

/**
 * Выбор клиники из нетворка
 */
function chooseClinicFromNetwork() {
    let clinics = [];

    state.networkBusinesses.forEach((bRef: GBookingCoreV2.BusinessRefInNetwork) => {
        clinics.push({
            name: bRef.info.general_info.name,
            value: bRef.businessID
        });
    });

    clinics.push(new inquirer.Separator());

    const questions = [
        {
            type: 'list',
            name: 'businessId',
            message: text.prompt_clinic_from_network,
            choices: clinics
        }
    ];

    return inquirer
        .prompt(questions)
        .then((answers) =>
            getBusinessByIdAction(Number(answers.businessId)))
        .then((business: GBookingCoreV2.BusinessClass) => state.business = business)
        .then(chooseBusinessOptions)
        .catch(handleTtyError);
}

/**
 * первое действие - выбрать бизнес или сеть?
 */
export function chooseBusinessOrNetwork(): Promise<void> {
    const questions = [
        {
            type: 'list',
            name: 'businessOrNetwork',
            message: text.prompt_business_or_network,
            choices: [
                {name: text.prompt_choices_business, value: 'business'},
                {name: text.prompt_choices_network, value: 'network'}
            ]
        }
    ];

    return inquirer
        .prompt(questions)
        .then(businessOrNetworkAnswer);
}

/**
 * В зависимости от того, что выбрано загружает одиночный бизнес или список бизнесов сети.
 * @param answers
 */
function businessOrNetworkAnswer(answers): Promise<void|GBookingCoreV2.BusinessClass> {
    switch (answers.businessOrNetwork) {
        case 'business':
            return getBusinessById()
                .then(chooseBusinessOptions);
        case 'network':
            return getNetworkById()
                .then(chooseClinicFromNetwork);
        default:
            throw "unknown value";
    }
}

/**
 * Выбирает действие над данными бизнеса:
 * - получение списка работников
 * - получение списка таксономий (услуг и категорий услуг)
 * - получение расписания работника по услуге
 * - получение расписания работника по всем его услугам
 * - резервирование слота времени
 * @param business
 */
function chooseBusinessOptions(business: GBookingCoreV2.BusinessClass) {
    const questions = [
        {
            type: 'list',
            name: 'action',
            message: text.prompt_action,
            choices: [
                {name: text.prompt_workers, value: 'workers'},
                {name: text.prompt_taxonomies, value: 'taxonomies'},
                {name: text.prompt_worker_taxonomy_schedule, value: 'worker_taxonomy_schedule'},
            ]
        }
    ];

    return inquirer
        .prompt(questions)
        .then(chooseBusinessOptionsAnswer);
}

export function handleTtyError(error) {
    if(error.isTtyError) {
        throw "Prompt couldn't be rendered in the current environment";
    }

    console.error("error %s\n", error.message, error.stack);
}

export function getBusinessById(): Promise<void|GBookingCoreV2.BusinessClass> {
    const questions = [
        {
            type: 'input',
            name: 'businessId',
            message: l10n[env.l10n].prompt_business_id,
            validate: (value) => !isNaN(Number(value))
        }
    ];

    return inquirer
        .prompt(questions)
        .then(answers =>
            getBusinessByIdAction(Number(answers.businessId)))
        .then((business: GBookingCoreV2.BusinessClass) => state.business = business)
        .catch(handleTtyError);
}


export function getNetworkById(): Promise<void|GBookingCoreV2.BusinessRefInNetwork[]> {
    const questions = [
        {
            type: 'input',
            name: 'networkId',
            message: l10n[env.l10n].prompt_network_id,
            validate: (value) => !isNaN(Number(value))
        }
    ];

    return inquirer
        .prompt(questions)
        .then(answers =>
            getNetworkBusinessListAction(Number(answers.networkId)))
        .then((businesses: GBookingCoreV2.BusinessRefInNetwork[]) => state.networkBusinesses = businesses)
        .catch(handleTtyError);
}

function getBusinessByIdAction(businessId): Promise<void|GBookingCoreV2.BusinessClass> {
    return MedMeAPI.business.getBusinessById(businessId)
        .catch(handleError);
}

function getNetworkBusinessListAction(networkId: number): Promise<void|GBookingCoreV2.BusinessRefInNetwork[]> {
    return MedMeAPI.business.getNetworkBusinessList(networkId)
        .catch(handleError);
}

/**
 * В зависимости от выбранной опции производит одно из действий над бизнесом.
 * @see chooseBusinessOptions
 * @param answers
 */
function chooseBusinessOptionsAnswer(answers) {
    switch (answers.action) {
        case 'workers':
            return chooseWorker();
        case 'taxonomies':
            return chooseTopTaxonomy();
        case 'worker_taxonomy_schedule':
            return chooseWorkerTaxonomySchedule();
    }
}

function string_format(str, ...replacements: string[]): string {
    return str.replace(/{(\d+)}/g, (match, number) =>
        typeof replacements[number] != 'undefined'
            ? replacements[number]
            : match);
}

/**
 *
 */
function chooseWorker() {
    const questions = [
        {
            type: 'list',
            name: 'worker',
            message: text.prompt_resource,
            choices: [
            ]
        }
    ];

    if (state.selectedTaxonomy)
        questions[0].message = string_format(text.prompt_resource_from_taxonomy, state.selectedTaxonomy.alias['ru-ru']);

    let resources = state.selectedTaxonomy ?
        state.businessModel().activeResourcesInWidgetFromTaxonomy(state.selectedTaxonomy.id, true) :
        state.businessModel().activeResourcesInWidget(true);

    resources.forEach((res) =>
        questions[0].choices.push({name: res.name + ' ' + res.surname, value: res}));

    if (questions[0].choices.length === 0) {
        const emptyQuestions = [
            {
                type: 'list',
                name: 'empty',
                message: text.empty_workers,
                choices: [
                    text.prompt_choose_another_business
                ]
            }
        ];

        return inquirer
            .prompt(emptyQuestions)
            .then(chooseClinic);
    }

    return inquirer
        .prompt(questions)
        .then(chooseWorkerAnswer);
}

function chooseWorkerAnswer(answer) {
    state.selectedWorker = answer.worker;
    if (state.selectedTaxonomy)
        return chooseWorkerTaxonomySchedule();

    return chooseWorkerTaxonomy(state.selectedWorker);
}


/**
 * Выбор услуг, выполняемых работником.
 * @param res
 */
function chooseWorkerTaxonomy(res: GBookingCoreV2.Resource) {
    const questions = [
        {
            type: 'list',
            name: 'taxonomy',
            message: text.prompt_taxonomy,
            choices: [
            ]
        }
    ];

    const model = state.businessModel();
    const workerTaxonomies = model.activeTaxonomiesInWidgetFromResource(res);
    for (let tax of workerTaxonomies) {
        let path = model.taxonomyPath(tax).map((tax) => tax.alias['ru-ru']).join(' > ');
        questions[0].choices.push({name: path, value: tax});
    }

    if (questions[0].choices.length === 0) {
        const emptyQuestions = [
            {
                type: 'list',
                name: 'empty',
                message: text.empty_taxonomies,
                choices: [
                    text.prompt_choose_another_business
                ]
            }
        ];

        return inquirer
            .prompt(emptyQuestions)
            .then(chooseClinic);
    }

    return inquirer
        .prompt(questions)
        .then(chooseTaxonomyAnswer.bind(null, {}));
}

/**
 * Выбор таксономии верхнего уровня.
 */
function chooseTopTaxonomy() {
    const model = state.businessModel();
    const taxonomies = model.activeTaxonomiesInWidget(true);
    const taxonomyTree = model.taxonomyTree(taxonomies);
    const topLayerTaxonomies = model.taxonomyTopLayer(taxonomyTree);
    if (!topLayerTaxonomies || topLayerTaxonomies.length === 0) {
        const emptyQuestions = [
            {
                type: 'list',
                name: 'empty',
                message: text.empty_taxonomies,
                choices: [
                    text.prompt_choose_another_business
                ]
            }
        ];

        return inquirer
            .prompt(emptyQuestions)
            .then(chooseClinic);
    }

    return chooseTaxonomy(taxonomyTree, topLayerTaxonomies);
}

function chooseTaxonomy(taxonomyTree, taxonomies) {
    const questions = [
        {
            type: 'list',
            name: 'taxonomy',
            message: text.prompt_taxonomy,
            choices: [
            ]
        }
    ];

    taxonomies.forEach((tax) =>
        questions[0].choices.push({name: tax.alias['ru-ru'], value: tax}));

    return inquirer
        .prompt(questions)
        .then(chooseTaxonomyAnswer.bind(null, taxonomyTree));
}

function chooseTaxonomyAnswer(taxonomyTree, answer) {
    const taxonomyLayer = taxonomyTree[answer.taxonomy.id];
    if (!taxonomyLayer || taxonomyLayer.length === 0) {
        state.selectedTaxonomy = answer.taxonomy;
        if (state.selectedWorker)
            return chooseWorkerTaxonomySchedule();
        return chooseWorker();
    }

    return chooseTaxonomy(taxonomyTree, taxonomyLayer);
}

/**
 *
 */
function chooseWorkerTaxonomySchedule() {
    const questions = [
        {
            type: 'list',
            name: 'daySchedule',
            message: text.prompt_schedule_day,
            choices: []
        }
    ];

    const businessParams = MedMeAPICracSlots.convertBusinessToParams(state.business);
    const filters = MedMeAPI.slots.createCRACResourcesAndRoomsFilters(state.selectedTaxonomy,
        [state.selectedWorker], new Date(), new Date(Date.now() + 7 * 86400000));
    MedMeAPI.slots.getCRACResourcesAndRooms(businessParams, filters)
        .then((res: GBookingCoreV2.CracSlotsGetCracResourcesAndRoomsResponse) => {
            for (let daySchedule of res.result.slots) {
                const hasSlots: boolean = daySchedule.resources[0].cutSlots.length > 0;
                if (hasSlots)
                    questions[0].choices.push({
                        name: `[${daySchedule.date.replace(/T.*$/, '')}]`,
                        value: daySchedule
                    });
            }

            if (questions[0].choices.length === 0) {
                const emptyQuestions = [
                    {
                        type: 'list',
                        name: 'empty',
                        message: text.empty_schedule_day,
                        choices: [
                            text.prompt_choose_another_business
                        ]
                    }
                ];

                return inquirer
                    .prompt(emptyQuestions)
                    .then(chooseClinic);
            }

            return inquirer
                .prompt(questions)
                .then(chooseWorkerTaxonomyScheduleAnswer);
        });
}

function chooseWorkerTaxonomyScheduleAnswer(answer) {
    const questions = [
        {
            type: 'list',
            name: 'slot',
            message: text.prompt_schedule_slot,
            choices: [
            ]
        }
    ];

    const daySchedule = answer.daySchedule as GBookingCoreV2.CracDaySchedule;
    fillSlots(questions[0].choices, daySchedule.resources[0].cutSlots);

    questions[0].choices.push(new inquirer.Separator());

    return inquirer
        .prompt(questions)
        .then(chooseWorkerTaxonomyScheduleAnswerStep2.bind(null, daySchedule.date));
}

function chooseWorkerTaxonomyScheduleAnswerStep2(date, answer) {
    let slot = answer.slot as GBookingCoreV2.CracCutSlot;
    const isoDateTime = date.replace(/T.*$/, '') + 'T' +
        formatSlotTime(slot.start) + ':00.000Z'
    return reserveAppointment(isoDateTime);
}

const align = (v: number): string =>
    v < 10 ? "0" + v : v.toString();

function formatSlot(slot: GBookingCoreV2.CracCutSlot) {
    return string_format('{0}:{1} - {2}:{3}', align(Math.floor(slot.start / 60)),
        align(slot.start % 60), align(Math.floor(slot.end / 60)), align(slot.end % 60));
}

function formatSlotTime(dt: number) {
    return string_format('{0}:{1}', align(Math.floor(dt / 60)),
        align(dt % 60));
}

function fillSlots(choices, slots: GBookingCoreV2.CracCutSlot[]) {
    for (let slot of slots)
        if (slot.available)
            choices.push({name: formatSlot(slot), value: slot});
}

function reserveAppointment(isoDateTime) {
    const params = {
        appointment: {
            start: isoDateTime,
            price: {
                currency: "RUB"
            }
        },
        business: {
            id: state.business.id,
        },
        resource: {
            id: state.selectedWorker.id
        },
        taxonomy: {
            id: state.selectedTaxonomy.id
        },
        source: 'CLI_APP'
    } as GBookingCoreV2.AppointmentReserve;

    return MedMeAPI.appointment.reserveAppointment(params)
        .then((appointment: GBookingCoreV2.Appointment) => {
            state.reservedAppointment = appointment;
            console.info(text.appointment_was_reserved);
            printReservedAppointmentInfo();
            return inputClientData();
        })
}

function printReservedAppointmentInfo() {
    const appointment = state.reservedAppointment;
    console.info(text.appointment_info,
        appointment.appointment.start, appointment.appointment.duration,
        appointment.resource.name + ' ' +
        (appointment.resource.middleName || '') +
        appointment.resource.surname,
        state.businessModel().getTaxonomyById(appointment.taxonomy.id).alias['ru-ru']);
}

function inputClientData() {
    console.info(text.input_client_data);
    const questions = [
        {
            type: 'input',
            name: 'surname',
            message: text.prompt_client_surname
        },
        {
            type: 'input',
            name: 'name',
            message: text.prompt_client_name
        },
        {
            type: 'input',
            name: 'middle_name',
            message: text.prompt_client_middle_name
        },
        {
            type: 'input',
            name: 'phone',
            message: text.prompt_client_phone
        },

    ];

    return inquirer
        .prompt(questions)
        .then(showAppointmentAndClient);
}

function showAppointmentAndClient(clientInput) {
    console.info("Проверьте данные записи перед подтверждением!");
    printReservedAppointmentInfo();
    console.info("Фамилия: %s\nИмя: %s\nОтчество: %s\nНомер телефона: %s",
        clientInput.client_surname, clientInput.client_name, clientInput.client_middle_name,
        clientInput.phone);

    const questions = [
        {
            type: 'list',
            name: 'confirm',
            message: text.prompt_confirm_appointment,
            choices: [
                {name:"y", value: true},
                {name:"n", value: false}
            ]
        }
    ];

    return inquirer
        .prompt(questions)
        .then((answer) => {
            if (!answer.confirm)
                return removeEmptyAppointment().then(chooseClinic);
            return addClientAndConfirmAppointment(clientInput);
        });
}

function removeEmptyAppointment() {
    console.assert(state.reservedAppointment !== null);
    const params = {
        appointment: {
            id: state.reservedAppointment.appointment.id
        },
        business: {
            id: state.reservedAppointment.business.id
        }
    } as GBookingCoreV2.RemoveEmptyAppointment;

    return MedMeAPI.appointment.clientRemoveEmptyAppointment(params)
        .then((res: boolean) => {
            state.reservedAppointment = null;
            if (res)
                console.warn(text.empty_appointment_removed);
            else
                console.info(text.empty_appointment_remove_error);

            return chooseClinic();
        });
}

function addClientAndConfirmAppointment(clientInput) {
    const clientParams = {
        business: {
            id: state.business.id,
        },
        client: {
            name: clientInput.name,
            surname: clientInput.surname,
            middle_name: clientInput.middle_name,
            phone: [{
                country_code: clientInput.phone.substr(0, 1),
                area_code: clientInput.phone.substr(1, 3),
                number: clientInput.phone.substr(4)
            }]
        }
    } as GBookingCoreV2.ClientAddClientRequestParams;

    MedMeAPI.client.addClient(clientParams)
        .then((res: GBookingCoreV2.ClientAddClientResponseResult) => {
            console.info('Клиент успешно добавлен/получен!');
            return MedMeAPI.appointment.clientConfirmAppointmentById(state.reservedAppointment.appointment.id,
                res.client.id);
        })
        .then((app: GBookingCoreV2.Appointment) => {
            console.info('Запись успешно подтверждена!');
            console.info('Вы можете посмотреть в списке своих записей.');
            return confirmAppointmentSuccessful();
        });
}

function confirmAppointmentSuccessful() {
    const questions = [
        {
            type: 'list',
            name: 'goto_start',
            message: text.prompt_appointment_confirmed_successful,
            choices: [
                text.prompt_choices_start
            ]
        }
    ];

    state.clear();

    return inquirer
        .prompt(questions)
        .then(chooseStart);
}
