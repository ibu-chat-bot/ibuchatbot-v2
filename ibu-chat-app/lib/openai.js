import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  console.warn('OpenAI API Key is missing in environment variables.')
}

export const openai = new OpenAI({ apiKey: apiKey || '' })
