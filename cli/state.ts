import * as GBookingCoreV2 from 'corev2-schemata/langs/typescript/GBookingCoreV2';
import {MedMedAPIBusinessModel} from 'corev2-ts-sdk/lib/businessModel';

class InteractiveCliState {
    business: GBookingCoreV2.BusinessClass = null;
    networkBusinesses: GBookingCoreV2.BusinessRefInNetwork[] = null;
    businessModel_: MedMedAPIBusinessModel = null;
    selectedTaxonomy: GBookingCoreV2.BusinessTaxonomy = null;
    selectedWorker: GBookingCoreV2.Resource = null;
    reservedAppointment: GBookingCoreV2.Appointment = null;
    businessModel(): MedMedAPIBusinessModel {
        return this.businessModel_ === null ? this.businessModel_ = new MedMedAPIBusinessModel(this.business) :
            this.businessModel_;
    }
    clear() {
        this.business = null;
        this.businessModel_ = null;
        this.networkBusinesses = null;
        this.selectedTaxonomy = null;
        this.selectedWorker = null;
        this.reservedAppointment = null;
    }
}

const state = new InteractiveCliState();
export default state;