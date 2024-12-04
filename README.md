# RSS & Podcast Parser API

A lightweight Node.js server that converts RSS feeds and podcasts into JSON format. Supports both RSS 2.0 and Atom feeds.

## Features

- RSS 2.0 and Atom feed support
- Podcast-specific metadata parsing
- Image extraction from feeds
- Redirect following
- CORS enabled
- Clean iTunes namespace handling

## Server Versions

Two server implementations are available:
- `server.js`: Native Node.js HTTP implementation
- `serveraxios.js`: Axios-based implementation with better redirect handling

## Installation

## Run locally

```
node server.js OR serveraxios.js
or
// change script--start in package.json for start only for serveraxios.js
npm start 
npm run start:axios 

bun start
bun start:axios
// change script--start in package.json for using start only for serveraxios.js

```

## Request Usage

e.g. http://localhost:8888/?url=https://rssfeedurl


## Deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/jackysee/RssJson)

