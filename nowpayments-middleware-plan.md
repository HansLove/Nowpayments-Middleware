# Nowpayments middleware

Este proyecto será un par de middlewares para express.js que integran funciones de nowpayments
que se pueden adaptar a la lógica de negocio de diferentes proyectos...

La idea que tengo en mente es crear middlewares con dependencias inyectables aprovechando
las capacidades de programación funcional de javascript y aplicar un patrón de cadena 
de responsabilidad...

Ejemplo: Muy básico y no conceptualizado completamente
```javascript
// This library
function createPayment({ ...deps }) {

  // Some logic to organize/format dependencies

  return (req, res) => {
    // ...Actual middleware logic
  }
}

// Client code
const express = require('express');
const nwmiddleware = require('@taloon/nowpayments-middleware');

const app = express();

const createPayment = mwmiddleware.createPayment({
  ...deps
})

app.use('/payments', createPayments, customLogicAfterMiddleware);

```

Las llamadas a nowpayments que vamos a soportar son...

## Create payments

Example request: Returns 201
```shell
curl --location 'https://api.nowpayments.io/v1/payment' \
--header 'x-api-key: {{api-key}}' \
--header 'Content-Type: application/json' \
--data '{
  "price_amount": 3999.5,
  "price_currency": "usd",
  "pay_currency": "btc",
  "ipn_callback_url": "https://nowpayments.io",
  "order_id": "RGDBP-21314",
  "order_description": "Apple Macbook Pro 2019 x 1"
  "customer_email": "email@email.com"
}'
```

Example response:
```json
{
  "payment_id": "5745459419",
  "payment_status": "waiting",
  "pay_address": "3EZ2uTdVDAMFXTfc6uLDDKR6o8qKBZXVkj",
  "price_amount": 3999.5,
  "price_currency": "usd",
  "pay_amount": 0.17070286,
  "pay_currency": "btc",
  "order_id": "RGDBP-21314",
  "order_description": "Apple Macbook Pro 2019 x 1",
  "ipn_callback_url": "https://nowpayments.io",
  "created_at": "2020-12-22T15:00:22.742Z",
  "updated_at": "2020-12-22T15:00:22.742Z",
  "purchase_id": "5837122679",
  "amount_received": null,
  "payin_extra_id": null,
  "smart_contract": "",
  "network": "btc",
  "network_precision": 8,
  "time_limit": null,
  "burning_percent": null,
  "expiration_estimate_date": "2020-12-23T15:00:22.742Z"
}
```

## Create payment by invoice

Example request: Returns 201
```shell
curl --location 'https://api.nowpayments.io/v1/invoice-payment' \
--header 'x-api-key: {{api-key}}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "iid": {{invoice_id}},
  "pay_currency": "btc",
  "purchase_id": {{purchase_id}},
  "order_description": "Apple Macbook Pro 2019 x 1",
  "customer_email": "test@gmail.com",
  "payout_address": "0x...",
  "payout_extra_id": null,
  "payout_currency": "usdttrc20"
}'
```

Example response:
```json
{
  "payment_id": "5745459419",
  "payment_status": "waiting",
  "pay_address": "3EZ2uTdVDAMFXTfc6uLDDKR6o8qKBZXVkj",
  "price_amount": 3999.5,
  "price_currency": "usd",
  "pay_amount": 0.17070286,
  "pay_currency": "btc",
  "order_id": "RGDBP-21314",
  "order_description": "Apple Macbook Pro 2019 x 1",
  "ipn_callback_url": "https://nowpayments.io",
  "created_at": "2020-12-22T15:00:22.742Z",
  "updated_at": "2020-12-22T15:00:22.742Z",
  "purchase_id": "5837122679",
  "amount_received": null,
  "payin_extra_id": null,
  "smart_contract": "",
  "network": "btc",
  "network_precision": 8,
  "time_limit": null,
  "burning_percent": null,
  "expiration_estimate_date": "2020-12-23T15:00:22.742Z"
}
```

## Create payout

Este es más bien para retiros

Example request: Returns 200
```shell 
curl --location 'https://api.nowpayments.io/v1/payout' \
--header 'Authorization: Bearer {{token}}' \
--header 'x-api-key: {{api-key}}' \
--header 'Content-Type: application/json' \
--data '{
    "ipn_callback_url": "https://nowpayments.io",
    "withdrawals": [
        {
            "address": "TEmGwPeRTPiLFLVfBxXkSP91yc5GMNQhfS",
            "currency": "trx",
            "amount": 200,
            "ipn_callback_url": "https://nowpayments.io"
        },
        {
            "address": "0x1EBAeF7Bee7B3a7B2EEfC72e86593Bf15ED37522",
            "currency": "eth",
            "amount": 0.1,
            "ipn_callback_url": "https://nowpayments.io"
        },
        {
            "address": "0x1EBAeF7Bee7B3a7B2EEfC72e86593Bf15ED37522",
            "currency": "usdc",
            "amount": 1,
            "fiat_amount": 100,
            "fiat_currency": "usd",
            "ipn_callback_url": "https://nowpayments.io"
        }
    ]
}'
```

Example response:

```json
{
  "id": "5000000713",
  "withdrawals": [
    {
      "is_request_payouts": false,
      "id": "5000000000",
      "address": "TEmGwPeRTPiLFLVfBxXkSP91yc5GMNQhfS",
      "currency": "trx",
      "amount": "200",
      "batch_withdrawal_id": "5000000000",
      "ipn_callback_url": "https://nowpayments.io",
      "status": "WAITING",
      "extra_id": null,
      "hash": null,
      "error": null,
      "payout_description": null,
      "unique_external_id": null,
      "created_at": "2020-11-12T17:06:12.791Z",
      "requested_at": null,
      "updated_at": null
    },
    {
      "is_request_payouts": false,
      "id": "5000000001",
      "address": "0x1EBAeF7Bee7B3a7B2EEfC72e86593Bf15ED37522",
      "currency": "eth",
      "amount": "0.1",
      "batch_withdrawal_id": "5000000000",
      "ipn_callback_url": "https://nowpayments.io",
      "status": "WAITING",
      "extra_id": null,
      "hash": null,
      "error": null,
      "payout_description": null,
      "unique_external_id": null,
      "createdAt": "2020-11-12T17:06:12.791Z",
      "requestedAt": null,
      "updatedAt": null
    },
    {
      "is_request_payouts": false,
      "id": "5000000002",
      "address": "0x1EBAeF7Bee7B3a7B2EEfC72e86593Bf15ED37522",
      "currency": "usdc",
      "amount": "99.84449793",
      "fiat_amount": "100",
      "fiat_currency": "usd",
      "batch_withdrawal_id": "5000000000",
      "ipn_callback_url": "https://nowpayments.io",
      "status": "WAITING",
      "extra_id": null,
      "hash": null,
      "error": null,
      "payout_description": null,
      "unique_external_id": null,
      "createdAt": "2020-11-12T17:06:12.791Z",
      "requestedAt": null,
      "updatedAt": null
    }
  ]
}
```

## Webhooks

Hay dos tipos de webhooks que vamos a proveer lógica en común también...

- Creación de pagos
- Creación de retiros

Lo importante de estos pagos es recepcionar el cuerpo de la solicitud y 
manejar los diferentes estados del pago/retiro de manera personalizada

Cuerpo de nowpayments que llega a webhooks de pagos (aplica también para la llamada a invoice):
```json
{
  "payment_id":123456789,
  "parent_payment_id":987654321,
  "invoice_id":null,
  "payment_status":"finished",
  "pay_address":"address",
  "payin_extra_id":null,
  "price_amount":1,
  "price_currency":"usd",
  "pay_amount":15,
  "actually_paid":15,
  "actually_paid_at_fiat":0,
  "pay_currency":"trx",
  "order_id":null,
  "order_description":null,
  "purchase_id":"123456789",
  "outcome_amount":14.8106,
  "outcome_currency":"trx",
  "payment_extra_ids":null
  "fee": {
    "currency":"btc",
    "depositFee":0.09853637216235617,
    "withdrawalFee":0,
    "serviceFee":0
  }
}
```

Cuerpo de nowpayments que llega a webhooks de retiros:
```json
{
  "id":"123456789",
  "batch_withdrawal_id":"987654321",
  "status":"CREATING",
  "error":null,
  "currency":"usdttrc20",
  "amount":"50",
  "address":"address",
  "fee":null,
  "extra_id":null,
  "hash":null,
  "ipn_callback_url":"callback_url",
  "created_at":"2023-07-27T15:29:40.803Z",
  "requested_at":null,
  "updated_at":null
}
```

### Statuses

En payment hay un campo que es `payment_status`, mientras que en el retiro es `status`
¿Cuáles son los posibles estados?

Se listan a continuación...

Pagos:
- waiting - waiting for the customer to send the payment. The initial status of each payment;
- confirming - the transaction is being processed on the blockchain. Appears when NOWPayments detect the funds from the user on the blockchain;
- Please note: each currency has its own amount of confirmations requires to start the processing.
- confirmed - the process is confirmed by the blockchain. Customer’s funds have accumulated enough confirmations;
- sending - the funds are being sent to your personal wallet. We are in the process of sending the funds to you;
- partially_paid - it shows that the customer sent the less than the actual price. Appears when the funds have arrived in your wallet;
- finished - the funds have reached your personal address and the payment is finished;
- failed - the payment wasn't completed due to the error of some kind;
- expired - the user didn't send the funds to the specified address in the 7 days time window;

Invoices:
- waiting - waiting for the customer to send the payment. The initial status of each payment;
- confirming - the transaction is being processed on the blockchain. Appears when NOWPayments detect the funds from the user on the blockchain;
- confirmed - the process is confirmed by the blockchain. Customer’s funds have accumulated enough confirmations;
- sending - the funds are being sent to your personal wallet. We are in the process of sending the funds to you;
- partially_paid - it shows that the customer sent the less than the actual price. Appears when the funds have arrived in your wallet;
- finished - the funds have reached your personal address and the payment is finished;
- failed - the payment wasn't completed due to the error of some kind;
- refunded - the funds were refunded back to the user;
- expired - the user didn't send the funds to the specified address in the 7 days time window;

Payouts (retiros en nuestro contexto):

- creating;
- waiting;
- processing;
- sending;
- finished;
- failed;
- rejected;

En las configuraciones de los middleware para webhooks, cada evento se ha de poder personalizar, recibiendo el cuerpo de nowpayments...
Ejemplo:

```javascript
function CreatePaymentWebhookMiddleware({
  onWaiting,
  onFinished
}) {

  return (req, res) => {
    const nowpaymentsBody = req.body;
    const status = req.body.payment_status;
    
    switch (status) {
      case 'waiting': {
        if (onWaiting) onWaiting(nowpaymentsBody);
        break;
      }
      case 'finished': {
        if (onFinished) onFinished(nowpaymentsBody);
      }
    }
  }
}
```