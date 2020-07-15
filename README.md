# Med.me CLI interactive booking application

Консольное приложение для онлайн записи через платформу Med.me.

Включает в себя следующие действия:
1. получение данных бизнеса
2. получение списка работников
3. получение списка таксономий (услуг и категорий услуг)
4. получение расписания работника по услуге
5. получение расписания работника по всем его услугам
6. резервирование слота времени
7. получение или создание клиента
8. подтверждение записи
9. получение списка записей (авторизация по otp)
10. отмена записи

## Installation

### for production

````bash
npm i
npm i @types/node
npm i https://github.com/GbookingLTD/widget-utils/archive/<version>.tar.gz
npm i https://github.com/GbookingLTD/corev2-schemata/archive/<version>.tar.gz
npm i https://github.com/GbookingLTD/corev2-ts-sdk/archive/<version>.tar.gz
````

### for development

you should download widget-utils and corev2-schemata and resolve
these dependencies using npm link.

````bash
npm i
npm i @types/node
npm link widget-utils
npm link corev2-schemata
npm link corev2-ts-sdk
````

