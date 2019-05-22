// import * as functions from 'firebase-functions'
const functions = require('firebase-functions')
// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

// import { dialogflow, SimpleResponse, Carousel, Image } from 'actions-on-google'
const actionsOnGoole = require('actions-on-google')

const app = actionsOnGoole.dialogflow({ debug: true })

app.intent('Default Welcome Intent', (conv) => {
      const now = Date()
      const data = now

      conv.close(new actionsOnGoole.SimpleResponse({
            text: `Hello, today's date is ${data}`,
            speech: `Date is ${data}` 
      }))

})

// function getTimetable() {
//       const now = Date()
//       return now
// }

exports.fulfillment = functions.https.onRequest(app)