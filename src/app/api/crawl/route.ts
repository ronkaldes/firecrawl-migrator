import { NextRequest, NextResponse } from 'next/server'
import FirecrawlApp from '@mendable/firecrawl-js'
// import { z } from 'zod' // Keeping for potential future use

// New endpoint for schema inference
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Ensure URL has proper protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Use API key from environment variable only
    const finalApiKey = process.env.FIRECRAWL_API_KEY
    if (!finalApiKey || finalApiKey === 'fc-YOUR_API_KEY') {
      return NextResponse.json(
        { error: 'Firecrawl API key not configured. Please check server configuration.' },
        { status: 500 }
      )
    }

    // Initialize Firecrawl with the provided API key
    const app = new FirecrawlApp({
      apiKey: finalApiKey
    })

    // First, scrape a sample page to analyze structure
    const scrapeResult = await app.scrapeUrl(url, {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      timeout: 30000, // 30 second timeout
      maxAge: 86400000 // Use 1 day cache for schema inference for speed
    } as Parameters<typeof app.scrapeUrl>[1])

    if (!scrapeResult.success) {
      // Provide more specific error messages
      const errorMessage = scrapeResult.error || 'Unknown scraping error'
      if (errorMessage.includes('502') || errorMessage.includes('Bad Gateway')) {
        return NextResponse.json({
          error: 'The website is temporarily unavailable. Please try again later or try a different URL.',
          fallbackSchema: getDefaultSchema()
        }, { status: 503 })
      }
      
      return NextResponse.json({
        error: `Failed to analyze website: ${errorMessage}`,
        fallbackSchema: getDefaultSchema()
      }, { status: 500 })
    }

    // Infer schema from the scraped content  
    const inferredSchema = inferSchemaFromContent(scrapeResult)

    return NextResponse.json({
      success: true,
      schema: inferredSchema,
      sampleContent: scrapeResult.markdown?.substring(0, 1000) + '...' // Preview
    })

  } catch (error) {
    
    // Provide helpful error messages and fallback schema
    let errorMessage = 'Failed to analyze website'
    
    if (error instanceof Error) {
      if (error.message.includes('502')) {
        errorMessage = 'The website is temporarily unavailable. Please try again later.'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'The website took too long to respond. Please try again.'
      } else if (error.message.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your Firecrawl API key.'
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json({
      error: errorMessage,
      fallbackSchema: getDefaultSchema()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
    const { url, schema, autoInfer = false, includeRaw = false, selectedUrls = [], maxAge = 0 } = body as {
      url: string
      schema?: Schema
      autoInfer?: boolean
      includeRaw?: boolean
      selectedUrls?: string[]
      maxAge?: number
    }

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Initialize Firecrawl with the environment API key
    const finalApiKey = process.env.FIRECRAWL_API_KEY
    if (!finalApiKey || finalApiKey === 'fc-YOUR_API_KEY') {
      return NextResponse.json(
        { error: 'Firecrawl API key not configured. Please check server configuration.' },
        { status: 500 }
      )
    }
    
    const app = new FirecrawlApp({
      apiKey: finalApiKey
    })

    let finalSchema = schema

         // If auto-infer is requested and no schema provided, infer it first
     if (autoInfer && !schema) {
       const scrapeResult = await app.scrapeUrl(url, {
         formats: ['markdown', 'html'],
         onlyMainContent: true
       })

       if (scrapeResult.success) {
         finalSchema = inferSchemaFromContent(scrapeResult)
       } else {
         // Fallback to basic schema if inference fails
         finalSchema = getDefaultSchema()
       }
     }

    if (!finalSchema) {
      return NextResponse.json(
        { error: 'Schema is required or auto-inference failed' },
        { status: 400 }
      )
    }

    let crawlResult: {
      success: boolean
      id?: string
      data?: Array<{
        json?: Record<string, unknown>
        extract?: Record<string, unknown>
        markdown?: string
        metadata?: Record<string, unknown>
        url?: string
        links?: string[]
        screenshot?: string
      }>
      total?: number
      completed?: number
      creditsUsed?: number
      error?: string
      status?: string
    }

    // Map + Batch Scrape Strategy
    if (!selectedUrls || selectedUrls.length === 0) {
      return NextResponse.json(
        { error: 'No URLs selected for scraping' },
        { status: 400 }
      )
    }
    
      
      // Build scrape options with schema if available
      interface ScrapeOptions {
        formats: string[]
        onlyMainContent: boolean
        timeout: number
        maxAge: number
        jsonOptions?: {
          schema: Record<string, unknown>
        }
      }
      
      const scrapeOptions: ScrapeOptions = {
        formats: finalSchema ? ['markdown', 'json'] : ['markdown'],
        onlyMainContent: true,
        timeout: 60000, // 60 second timeout per URL
        maxAge: maxAge
      }
      
      // Add jsonOptions if we have a schema
      if (finalSchema) {
        const jsonSchema = createJsonSchema(finalSchema)
        scrapeOptions.jsonOptions = { schema: jsonSchema }
      }
      
      
      try {
        // Use Firecrawl SDK's synchronous batch scrape method
        
        // Call the synchronous batchScrapeUrls method
        const batchScrapeResult = await app.batchScrapeUrls(selectedUrls, scrapeOptions as Parameters<typeof app.batchScrapeUrls>[1])
        
        
        if (!batchScrapeResult.success) {
          throw new Error('error' in batchScrapeResult ? batchScrapeResult.error : 'Batch scrape failed')
        }
        
        // Convert SDK response to our format
        const resultData = 'data' in batchScrapeResult ? batchScrapeResult.data || [] : []
        crawlResult = {
          success: true,
          data: resultData,
          total: selectedUrls.length,
          completed: resultData.length,
          creditsUsed: 'creditsUsed' in batchScrapeResult ? batchScrapeResult.creditsUsed : resultData.length
        }
        
        
      } catch {

        // Fallback to individual scraping if batch fails
        const fallbackResults: Array<{
          success: boolean
          error?: string
          url?: string
          data?: unknown
          json?: Record<string, unknown>
          extract?: Record<string, unknown>
          markdown?: string
          metadata?: Record<string, unknown>
          links?: string[]
          screenshot?: string
        }> = []
        
        for (const url of selectedUrls) {
          try {
            const result = await app.scrapeUrl(url, scrapeOptions as Parameters<typeof app.scrapeUrl>[1])
            fallbackResults.push(result)
          } catch (err) {
            fallbackResults.push({
              success: false,
              error: err instanceof Error ? err.message : 'Scrape failed',
              url,
              metadata: { sourceURL: url }
            })
          }
        }
        
        // Convert to batch scrape result format
        crawlResult = {
          success: true,
          data: fallbackResults.filter(r => r.success).map(result => {
            if ('data' in result && result.data) {
              return result.data as {
                json?: Record<string, unknown>
                extract?: Record<string, unknown>
                markdown?: string
                metadata?: Record<string, unknown>
                url?: string
                links?: string[]
                screenshot?: string
              }
            }
            return {
              json: 'json' in result ? result.json : undefined,
              extract: 'extract' in result ? result.extract : undefined,
              markdown: 'markdown' in result ? result.markdown || '' : '',
              metadata: 'metadata' in result ? result.metadata || {} : {},
              url: String(('url' in result ? result.url : '') || ('metadata' in result && result.metadata ? (result.metadata as Record<string, unknown>)?.sourceURL : '') || ''),
              links: 'links' in result ? result.links || [] : [],
              screenshot: 'screenshot' in result ? result.screenshot : undefined
            }
          }),
          total: selectedUrls.length,
          completed: fallbackResults.filter(r => r.success).length,
          creditsUsed: fallbackResults.filter(r => r.success).length
        }
        
      }
      



    // Extract the JSON data from each page
    const extractedData = (crawlResult.data?.map((page) => {
      // If we have structured data, use it
      if (page.json || page.extract) {
        return page.json || page.extract
      }
      
      // Otherwise, extract from markdown using the schema
      const structuredData: Record<string, unknown> = {}
      
      // Extract based on schema properties
      for (const [key, property] of Object.entries(finalSchema.properties)) {
        if (key === 'title') {
          // Try to extract title from metadata or first heading
          structuredData.title = page.metadata?.title || extractTitleFromMarkdown(page.markdown || '')
        } else if (key === 'date') {
          // Try to extract date from metadata or content
          structuredData.date = page.metadata?.publishedTime || extractDateFromMarkdown(page.markdown || '')
        } else if (key === 'content') {
          // Use the markdown content
          structuredData.content = page.markdown || ''
        } else if (key === 'url') {
          // Use the page URL
          structuredData.url = page.metadata?.sourceURL || page.url || ''
        } else {
          // For other fields, try to extract from markdown
          structuredData[key] = extractFieldFromMarkdown(page.markdown || '', key, property.type as string)
        }
      }
      
      return structuredData
    }) || []) as Record<string, unknown>[]

    const response: {
      success: boolean
      data: Array<Record<string, unknown>>
      totalPages: number
      completed: number
      inferredSchema?: Schema
      strategy: string
      creditsUsed: number
      rawData?: Array<{
        extractedJson: Record<string, unknown> | null
        metadata: Record<string, unknown>
        url: string
        markdown: string
        links: string[]
        screenshot: string | null
      }>
    } = {
      success: true,
      data: extractedData,
      totalPages: crawlResult.total || extractedData.length,
      completed: crawlResult.completed || extractedData.length,
      inferredSchema: autoInfer ? finalSchema : undefined,
      strategy: 'mapCrawl',
      creditsUsed: selectedUrls.length + 2
    }

    // Include raw data if requested
    if (includeRaw) {
      response.rawData = crawlResult.data?.map((page) => ({
        // Include the extracted data
        extractedJson: page.json || page.extract || null,
        // Include page metadata
        metadata: page.metadata || {},
        // Include source URL
        url: String(page.url || page.metadata?.sourceURL || ''),
        // Include markdown content (truncated for size)
        markdown: (page.markdown?.substring(0, 2000) || '') + (page.markdown && page.markdown.length > 2000 ? '...' : ''),
        // Include any other relevant data
        links: page.links || [],
        screenshot: page.screenshot || null
      })) || []
    }

    return NextResponse.json(response)

  } catch (error) {
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to crawl website' },
      { status: 500 }
    )
  }
}

interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array'
  description?: string
}

interface Schema {
  type: string
  properties: Record<string, SchemaProperty>
}

// Convert our schema format to Zod schema for Firecrawl v1
// Keeping this for potential future use
// function createZodSchema(schema: Schema): z.ZodObject<Record<string, unknown>> {
//   const zodProperties: Record<string, z.ZodType<unknown>> = {}
//   
//   for (const [key, property] of Object.entries(schema.properties)) {
//     // Convert spaces to underscores in field names
//     const safeName = key.replace(/\s+/g, '_')
//     
//     switch (property.type) {
//       case 'string':
//         zodProperties[safeName] = z.string().nullable().optional().describe(property.description || `${key} field`)
//         break
//       case 'number':
//         zodProperties[safeName] = z.number().nullable().optional().describe(property.description || `${key} field`)
//         break
//       case 'boolean':
//         zodProperties[safeName] = z.boolean().nullable().optional().describe(property.description || `${key} field`)
//         break
//       case 'array':
//         zodProperties[safeName] = z.array(z.string()).nullable().optional().describe(property.description || `${key} field`)
//         break
//       default:
//         zodProperties[safeName] = z.string().nullable().optional().describe(property.description || `${key} field`)
//     }
//   }
//   
//   return z.object(zodProperties)
// }

// Convert our schema format to JSON schema for Firecrawl
function createJsonSchema(schema: Schema) {
  const jsonProperties: { [key: string]: Record<string, unknown> } = {}
  
  for (const [key, property] of Object.entries(schema.properties)) {
    switch (property.type) {
      case 'string':
        jsonProperties[key] = { 
          type: 'string',
          description: property.description || `${key} field`
        }
        break
      case 'number':
        jsonProperties[key] = { 
          type: 'number',
          description: property.description || `${key} field`
        }
        break
      case 'boolean':
        jsonProperties[key] = { 
          type: 'boolean',
          description: property.description || `${key} field`
        }
        break
      case 'array':
        jsonProperties[key] = { 
          type: 'array',
          items: { type: 'string' },
          description: property.description || `${key} field`
        }
        break
      default:
        jsonProperties[key] = { 
          type: 'string',
          description: property.description || `${key} field`
        }
    }
  }
  
  return {
    type: 'object',
    properties: jsonProperties,
    required: Object.keys(schema.properties)
  }
}

// Intelligent schema inference based on content analysis
function inferSchemaFromContent(data: { markdown?: string; html?: string }): Schema {
  const markdown = data?.markdown || ''
  const html = data?.html || ''
  const content = markdown + ' ' + html

  const schema: Schema = {
    type: 'object',
    properties: {}
  }

  // Common patterns to detect
  const patterns = [
    // E-commerce patterns
    { regex: /\$[\d,]+\.?\d*/g, field: 'price', type: 'string' as const, description: 'Product price' },
    { regex: /price[:\s]*\$?[\d,]+\.?\d*/gi, field: 'price', type: 'string' as const, description: 'Price information' },
    
    // Title patterns
    { regex: /<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi, field: 'title', type: 'string' as const, description: 'Main title or heading' },
    
    // Description patterns
    { regex: /<p[^>]*>([^<]{50,})<\/p>/gi, field: 'description', type: 'string' as const, description: 'Content description' },
    
    // Image patterns
    { regex: /<img[^>]*src="([^"]+)"/gi, field: 'image_url', type: 'string' as const, description: 'Image URL' },
    { regex: /\!\[([^\]]*)\]\(([^)]+)\)/g, field: 'image_url', type: 'string' as const, description: 'Image URL from markdown' },
    
    // Category patterns
    { regex: /category[:\s]*([^,\n]+)/gi, field: 'category', type: 'string' as const, description: 'Product or content category' },
    { regex: /tags?[:\s]*([^,\n]+)/gi, field: 'tags', type: 'array' as const, description: 'Content tags' },
    
    // Contact/Business patterns
    { regex: /phone[:\s]*([^,\n]+)/gi, field: 'phone', type: 'string' as const, description: 'Phone number' },
    { regex: /email[:\s]*([^,\s\n]+@[^,\s\n]+)/gi, field: 'email', type: 'string' as const, description: 'Email address' },
    { regex: /address[:\s]*([^,\n]{10,})/gi, field: 'address', type: 'string' as const, description: 'Physical address' },
    
    // Date patterns
    { regex: /\d{1,2}\/\d{1,2}\/\d{4}/g, field: 'date', type: 'string' as const, description: 'Date information' },
    { regex: /\d{4}-\d{2}-\d{2}/g, field: 'date', type: 'string' as const, description: 'Date in ISO format' },
    
    // Rating patterns
    { regex: /rating[:\s]*(\d+\.?\d*)/gi, field: 'rating', type: 'number' as const, description: 'Rating score' },
    { regex: /(\d+\.?\d*)\s*stars?/gi, field: 'rating', type: 'number' as const, description: 'Star rating' },
    
    // Stock/Availability
    { regex: /in\s+stock/gi, field: 'availability', type: 'string' as const, description: 'Stock availability' },
    { regex: /out\s+of\s+stock/gi, field: 'availability', type: 'string' as const, description: 'Stock availability' },
    
    // Author/Publisher
    { regex: /author[:\s]*([^,\n]+)/gi, field: 'author', type: 'string' as const, description: 'Content author' },
    { regex: /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/g, field: 'author', type: 'string' as const, description: 'Author name' },
    
    // ID patterns
    { regex: /id[:\s]*([A-Za-z0-9-_]+)/gi, field: 'id', type: 'string' as const, description: 'Unique identifier' },
    { regex: /sku[:\s]*([A-Za-z0-9-_]+)/gi, field: 'sku', type: 'string' as const, description: 'Product SKU' },
  ]

  // Apply pattern matching
  patterns.forEach(pattern => {
    const matches = content.match(pattern.regex)
    if (matches && matches.length > 0) {
      schema.properties[pattern.field] = {
        type: pattern.type,
        description: pattern.description
      }
    }
  })

  // Always include basic fields if not detected
  if (!schema.properties.title) {
    schema.properties.title = { type: 'string', description: 'Main title or name' }
  }
  
  if (!schema.properties.description) {
    schema.properties.description = { type: 'string', description: 'Main content or description' }
  }

  // Content-type specific fields
  if (content.toLowerCase().includes('product') || schema.properties.price) {
    // E-commerce detected
    if (!schema.properties.price) schema.properties.price = { type: 'string', description: 'Product price' }
    if (!schema.properties.category) schema.properties.category = { type: 'string', description: 'Product category' }
    if (!schema.properties.availability) schema.properties.availability = { type: 'string', description: 'Stock status' }
  }

  if (content.toLowerCase().includes('article') || content.toLowerCase().includes('blog')) {
    // Blog/Article detected
    if (!schema.properties.author) schema.properties.author = { type: 'string', description: 'Article author' }
    if (!schema.properties.date) schema.properties.date = { type: 'string', description: 'Publication date' }
    if (!schema.properties.tags) schema.properties.tags = { type: 'array', description: 'Article tags' }
  }

  if (content.toLowerCase().includes('contact') || schema.properties.phone || schema.properties.email) {
    // Contact/Business page detected
    if (!schema.properties.name) schema.properties.name = { type: 'string', description: 'Business or person name' }
    if (!schema.properties.phone) schema.properties.phone = { type: 'string', description: 'Phone number' }
    if (!schema.properties.email) schema.properties.email = { type: 'string', description: 'Email address' }
    if (!schema.properties.address) schema.properties.address = { type: 'string', description: 'Physical address' }
  }

  return schema
}

// Fallback default schema
function getDefaultSchema(): Schema {
  return {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Main title or heading' },
      description: { type: 'string', description: 'Content description' },
      url: { type: 'string', description: 'Source URL' }
    }
  }
}

// Helper functions to extract data from markdown
function extractTitleFromMarkdown(markdown: string): string {
  // Look for first H1 heading
  const h1Match = markdown.match(/^#\s+(.+)$/m)
  if (h1Match) return h1Match[1].trim()
  
  // Look for first H2 heading
  const h2Match = markdown.match(/^##\s+(.+)$/m)
  if (h2Match) return h2Match[1].trim()
  
  // Take first line as title
  const firstLine = markdown.split('\n')[0]
  return firstLine ? firstLine.trim() : ''
}

function extractDateFromMarkdown(markdown: string): string {
  // Look for common date patterns
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
    /(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i  // Added pattern for "Oct 21, 2024"
  ]
  
  for (const pattern of datePatterns) {
    const match = markdown.match(pattern)
    if (match) return match[1]
  }
  
  return ''
}

function extractFieldFromMarkdown(markdown: string, fieldName: string, fieldType: string): unknown {
  // Simple extraction based on field name
  const fieldRegex = new RegExp(`${fieldName}[:\\s]+(.+)`, 'i')
  const match = markdown.match(fieldRegex)
  
  if (match) {
    const value = match[1].trim()
    
    // Convert based on type
    if (fieldType === 'number') {
      const num = parseFloat(value)
      return isNaN(num) ? null : num
    } else if (fieldType === 'boolean') {
      return value.toLowerCase() === 'true' || value.toLowerCase() === 'yes'
    } else if (fieldType === 'array') {
      return value.split(',').map(s => s.trim())
    }
    
    return value
  }
  
  return fieldType === 'array' ? [] : ''
}

