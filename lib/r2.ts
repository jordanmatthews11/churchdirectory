import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

function getEnv(key: string): string {
  const value = process.env[key]?.trim()
  if (!value) throw new Error(`Missing environment variable: ${key}`)
  return value
}

let _client: S3Client | null = null

function getClient(): S3Client {
  if (_client) return _client
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${getEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
    },
  })
  return _client
}

function getBucket(): string {
  return getEnv('R2_BUCKET_NAME')
}

export function getPublicUrl(key: string): string {
  return `${getEnv('R2_PUBLIC_URL').replace(/\/+$/, '')}/${key}`
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const client = getClient()
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  return getPublicUrl(key)
}

export async function deleteObject(key: string): Promise<void> {
  const client = getClient()
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  )
}

export function keyFromPublicUrl(url: string): string | null {
  const publicBase = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, '')
  if (!publicBase || !url.startsWith(publicBase)) return null
  return url.slice(publicBase.length + 1)
}
