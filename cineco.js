const http    = require('http')
const _       = require('lodash')
const cinemas = require('./cinemas') 
const fetch   = require('isomorphic-fetch')
const cheerio = require('cheerio')

const BASE_URL = 'http://www.cinecolombia.com'

module.exports.CINEMAS = cinemas

module.exports.getMoviesFor = function getMoviesFor (cinema) {
  return new Promise((resolve, reject) => {
    const match = _.find(cinemas, {name: cinema})
    if (match) {
      fetch(BASE_URL + match.path)
        .then(response => {
          if (response.status >= 400) {
            throw new Error('Couldn\'t connect to CineColombia')
          } else {
            return response.text()
          }
        })
        .then(htmlText => {
          let $ = cheerio.load(htmlText)
          console.log('here >', $)
          let movies = $('.pelicula')
                          .toArray()
                          .map(node => {
                            let $node = cheerio(node)
                            return {
                              title: cleanName($node.find('.title').attr('title')),
                              functions: $node.find('.funciones a')
                                              .toArray()
                                              .map(h => cheerio(h).text())
                            }
                          })
          console.log(movies)
          resolve(movies)
        })
    } else {
      reject('No match for: ' + cinema)
    }
  })
}

function cleanName (name) {
  return name
          .replace('¡', '')
          .replace('¿', '')
}
