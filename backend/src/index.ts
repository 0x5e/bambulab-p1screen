import mqtt from 'mqtt'
import { WebSocketServer } from 'ws'
import express from 'express'
import http from 'node:http'
import path from 'node:path'
import { unzipSync } from 'fflate'

const WEB_PORT = Number(process.env.PORT ?? (process.env.NODE_ENV === 'production' ? '8888' : '8889'))
const WEB_ROOT = path.resolve(process.cwd(), 'dist/web')


const app = express()

async function get3MFThumbnail(url: string, plate_idx: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    const unzipped = unzipSync(data)
    const thumbnailData = unzipped[`Metadata/plate_${plate_idx}.png`]
    return thumbnailData || null
  } catch (err) {
    console.error('[server] get3MFThumbnail error:', err)
    return null
  }
}

app.get('/api/getThumbnail', async (req, res) => {
  const url = req.query.url as string
  const plate_idx = req.query.plate_idx as string
  if (!url || !plate_idx) {
    res.status(400).send('Missing parameter')
    return
  }
  const data = await get3MFThumbnail(url, plate_idx)
  if (data) {
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=2592000') // 30 days
    res.send(Buffer.from(data))
  } else {
    res.status(404).send('Thumbnail not found')
  }
})

app.use('/', express.static(WEB_ROOT))

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (socket, req) => {
  const remote = req.socket.remoteAddress + ':' + req.socket.remotePort
  const reqUrl = new URL(req.url ?? '', `http://${req.headers.host}`)
  const ip = reqUrl?.searchParams.get('ip')
  const serial = reqUrl?.searchParams.get('serial')
  const code = reqUrl?.searchParams.get('code')

  if (!ip || !serial || !code) {
    console.error(`[mqtt][${remote}] missing params`)
    socket.close()
    return
  }

  const reportTopic = `device/${serial}/report`
  const commandTopic = `device/${serial}/request`

  const brokerUrl = `mqtts://${ip}:8883`
  console.info(`[mqtt][${remote}] connecting to ${brokerUrl}`)
  let mqttClient = mqtt.connect(brokerUrl, {
    clientId: `p1screen_${remote}`,
    username: 'bblp',
    password: code,
    protocolVersion: 4,
    port: 8883,
    rejectUnauthorized: false
  })

  mqttClient.on('connect', () => {
    console.info(`[mqtt][${remote}] connected`)
    mqttClient.subscribe(reportTopic, (err) => {
      console.info(`[mqtt][${remote}] subscribe topic: ${reportTopic}, err = ${err?.message}`)
    })
  })

  mqttClient.on('message', (topic, payload) => {
    console.info(`[mqtt][${remote}] message received, topic = ${topic}, payload = ${payload.toString()}`)
    socket.send(payload.toString())
  })
  
  mqttClient.on('disconnect', () => {
    console.info(`[mqtt][${remote}] disconnected`)
    socket.close()
  })

  mqttClient.on('close', () => {
    console.info(`[mqtt][${remote}] closed`)
    socket.close()
  })

  mqttClient.on('error', (err) => {
    console.error(`[mqtt][${remote}] error`, err.message)
    socket.close()
  })


  socket.on('message', (raw) => {
    if (!mqttClient) {
      console.error(`[ws][${remote}] mqtt not initialized`)
      return
    }
    
    let data = (typeof raw == 'string') ? raw : raw.toString('utf8')
    console.error(`[ws][${remote}] send message, topic = ${commandTopic}, payload = ${data}`)
    mqttClient.publish(commandTopic, data)
  })

  socket.on('close', () => {
    console.error(`[ws][${remote}] closed`)
    mqttClient.end(true)
  })
})

const start = async () => {
  server.listen(WEB_PORT, () => {
    console.log(`[ws] listening on ${WEB_PORT}`)
    if (process.env.NODE_ENV === 'production') {
      console.log(`[prod] serving ${WEB_ROOT}`)
    }
  })
}

start().catch((err) => {
  console.error('[server] failed to start', err)
  process.exit(1)
})
