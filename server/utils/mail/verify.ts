import { ImapFlow } from 'imapflow'
import nodemailer from 'nodemailer'

export async function verifySmtp(config: {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
}) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
  })
  await transporter.verify()
}

export async function verifyImap(config: {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
}) {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
    logger: false,
  })
  try {
    await client.connect()
  }
  finally {
    await client.logout().catch(() => undefined)
  }
}
