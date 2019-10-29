const {
      dialogflow,
      SimpleResponse,
      Table,
      Image,
      Button,
      SignIn
} = require('actions-on-google')
const admin = require('firebase-admin');
const functions = require('firebase-functions')
const firebase = require('firebase/app')

const firebaseConfig = {
      apiKey: "AIzaSyC7TDSiX_JQV7XwXe5kNSizASfdKehkuE4",
      authDomain: "timetable-7b63e.firebaseapp.com",
      databaseURL: "https://timetable-7b63e.firebaseio.com",
      projectId: "timetable-7b63e",
      storageBucket: "timetable-7b63e.appspot.com",
      messagingSenderId: "848995382512",
      appId: "1:848995382512:web:cbf056ea923c505b"
};

firebase.initializeApp(firebaseConfig);
admin.initializeApp(functions.config().firebase);
var db = admin.firestore();

const app = dialogflow({
      debug: true,
      clientId: "848995382512-p422t8evvlp9th9oid2ofcrim2lkp3kq.apps.googleusercontent.com"
})

app.intent('Default Welcome Intent', (conv) => {
      conv.ask(new SignIn('To get your Timetable'))

      var hongKong = new Date()
      var currentIndiaTime = hongKong
      currentIndiaTime.setHours(hongKong.getHours() - 2, hongKong.getMinutes() - 30)
      currentIndiaTime = currentIndiaTime.toString()
      var day = currentIndiaTime.split(' ')[0].toLowerCase()

      var holidayStatus = checkHoliday(currentIndiaTime)
      if (!holidayStatus.isHoliday) {
            var timetable = getTimetable(day)

            conv.close(new SimpleResponse({
                  text: "Today's time table is",
                  // speech: `You have these classes on ${timetable.day}`
                  speech: getSpeech(timetable, currentIndiaTime)
                  // TODO text/speech should tell books to be swapped
            }))
            conv.close(new Table({
                  title: `${timetable.day}'s classes`,
                  subtitle: `Classes you have today`,
                  image: new Image({
                        url: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/Ramaiah_Institutions_Logo.png/220px-Ramaiah_Institutions_Logo.png',
                        alt: 'Test alt text and image'
                  }),
                  columns: [
                        {
                              header: 'Subject',
                        },
                        {
                              header: 'Time'
                        }
                  ],
                  rows: getRows(timetable),
                  buttons: new Button({
                        // TODO: add section changing option
                        title: 'Change section',
                        url: 'https://www.google.com' // test url
                  })
            }))
      }
      else {
            conv.ask(new SimpleResponse({
                  text: `Today is holiday due to ${holidayStatus.reason}, Want to know tomorrow's timetable?`,
                  speech: "You don't have classes today"
            }))
      }
})

app.intent('Sign In Confirmation', async (conv, params, signin) => {
      if (signin.status !== 'OK') {
            return conv.close("Please try again")
      }
      const { email } = conv.user;
})

exports.fulfillmentHKG = functions
      .region('asia-east2')
      .https.onRequest(app)