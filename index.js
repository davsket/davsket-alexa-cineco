const Alexa      = require('alexa-sdk')
const context    = require('aws-lambda-mock-context');
const _          = require('lodash')
const express    = require('express')
const alexa      = require('alexa-app')
const bodyParser = require('body-parser')
const cineco     = require('./cineco')
const PORT       = process.env.PORT || 5000

const app        = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.post('/', function (req, res) {
    var ctx = context()
    handler(req.body, ctx)
    ctx.Promise
        .then(resp => {
          // console.log('resp', resp)
          return res.status(200).json(resp)
        })
        .catch(err => {  console.log(err); })
})

function getMoviesFor (cinema) {
  cineco
    .getMoviesFor(cinema)
    .then(movies => {
      this.emit(':ask', `There are these movies for today on ${cinema}: ${movies.map(m => m.title).join(', ')}`)
    }, err => {
      console.error(err)
      this.emit(':tell', 'Sorry, I couldn\'t contact to Cineco')
    })
}

const handlers = {
  LaunchRequest: function () {
    console.log('Welcome to Cineco')
    this.emit(':ask', 'Welcome to Cineco, do you want to see what\'s on Unicentro?')
  },
  YesIntent: function () {
    console.log('Listing movies...')
    getMoviesFor.call(this, 'unicentro')
  },
  NoIntent: function () {
    console.log('Listing cinemas...')
    this.emit(':ask', `Which one of these cinemas do you want to consult? ${cineco.CINEMAS.map(c => c.name).join(', ')}.`)
  },
  SelectIntent: function () {
    const slots  = this.event.request.intent.slots
    const cinema = slots.cinema
    getMoviesFor.call(this, cinema)
  },
  Unhandled: function () {
    this.emit(':ask', `I'm sorry, I couldn\'t understand what you said. Can you repeat again?`)
  }
};

function handler (event, context, callback) {
  var alexa = Alexa.handler(event, context)
  alexa.appId = 'amzn1.ask.skill.59245af3-f646-4348-98d2-47339ebe586f'
  alexa.registerHandlers(handlers)
  alexa.execute()
}

app.listen(PORT)
console.log('Listening on port ' + PORT + ', try http://localhost:' + PORT + '/alexa');
