'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Layout, MainContent, Footer } from '@/components/layout/layout'
import { Header } from '@/components/layout/header'
import { Hero } from '@/components/layout/hero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ChevronRightIcon, ChevronDownIcon } from 'lucide-react'

type Step = 1 | 2 | 3 | 4
type Platform = 'wordpress' | 'shopify' | 'webflow' | 'drupal' | 'squarespace' | 'wix' | 'csv' | 'custom' | null

interface SchemaField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array'
  description?: string
}

// TreeView Component
interface TreeNode {
  urls: string[]
  children: Record<string, TreeNode>
  count: number
  path: string
}

// Collapsible JSON viewer component
interface CollapsibleJSONProps {
  data: unknown
  depth?: number
}

function CollapsibleJSON({ data, depth = 0 }: CollapsibleJSONProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  
  const toggleCollapse = (key: string) => {
    const newCollapsed = new Set(collapsed)
    if (newCollapsed.has(key)) {
      newCollapsed.delete(key)
    } else {
      newCollapsed.add(key)
    }
    setCollapsed(newCollapsed)
  }
  
  const renderValue = (value: unknown, key: string, parentKey: string = ''): React.ReactElement => {
    const fullKey = parentKey ? `${parentKey}.${key}` : key
    const indent = '  '.repeat(depth)
    
    if (value === null) return <span className="text-orange-400">null</span>
    if (value === undefined) return <span className="text-orange-400">undefined</span>
    
    if (typeof value === 'string') {
      // Check if string is long (more than 160 chars for better UX)
      if (value.length > 160) {
        const isCollapsed = collapsed.has(fullKey)
        // Show first line or 160 chars when collapsed
        const firstLineEnd = value.indexOf('\n')
        const truncateAt = firstLineEnd > 0 && firstLineEnd < 160 ? firstLineEnd : 160
        
        return (
          <span>
            {isCollapsed ? (
              <>
                <span className="text-white">&quot;{value.substring(0, truncateAt)}...&quot;</span>
                <button
                  onClick={() => toggleCollapse(fullKey)}
                  className="ml-2 text-zinc-500 hover:text-zinc-300 text-[10px] font-mono"
                >
                  [+{value.length - truncateAt} chars]
                </button>
              </>
            ) : (
              <div className="inline-block align-top">
                <span className="text-white">&quot;</span>
                <div className="inline-block max-w-xl overflow-x-hidden whitespace-pre-wrap break-words align-top text-white">
                  {value}
                </div>
                <span className="text-white">&quot;</span>
                <button
                  onClick={() => toggleCollapse(fullKey)}
                  className="ml-2 text-zinc-500 hover:text-zinc-300 text-[10px] font-mono align-top"
                >
                  [collapse]
                </button>
              </div>
            )}
          </span>
        )
      }
      return <span className="text-white">&quot;{value}&quot;</span>
    }
    
    if (typeof value === 'number') return <span className="text-blue-400">{value}</span>
    if (typeof value === 'boolean') return <span className="text-purple-400">{String(value)}</span>
    
    if (Array.isArray(value)) {
      const isCollapsed = collapsed.has(fullKey)
      if (value.length === 0) return <span className="text-zinc-400">[]</span>
      
      return (
        <span>
          <button
            onClick={() => toggleCollapse(fullKey)}
            className="text-zinc-500 hover:text-zinc-300 mr-1"
          >
            {isCollapsed ? <ChevronRightIcon className="w-3 h-3 inline" /> : <ChevronDownIcon className="w-3 h-3 inline" />}
          </button>
          <span className="text-zinc-400">[</span>
          {!isCollapsed && (
            <>
              {value.map((item, i) => (
                <div key={i} className="ml-4">
                  {indent}  {renderValue(item, String(i), fullKey)}
                  {i < value.length - 1 && <span className="text-zinc-400">,</span>}
                </div>
              ))}
              <div>{indent}</div>
            </>
          )}
          {isCollapsed && <span className="text-zinc-500">...{value.length} items</span>}
          <span className="text-zinc-400">]</span>
        </span>
      )
    }
    
    if (typeof value === 'object' && value !== null) {
      const isCollapsed = collapsed.has(fullKey)
      const entries = Object.entries(value)
      if (entries.length === 0) return <span className="text-zinc-400">{'{}'}</span>
      
      return (
        <span>
          <button
            onClick={() => toggleCollapse(fullKey)}
            className="text-zinc-500 hover:text-zinc-300 mr-1"
          >
            {isCollapsed ? <ChevronRightIcon className="w-3 h-3 inline" /> : <ChevronDownIcon className="w-3 h-3 inline" />}
          </button>
          <span className="text-zinc-400">{'{'}</span>
          {!isCollapsed && (
            <>
              {entries.map(([k, v], i) => (
                <div key={k} className="ml-4">
                  {indent}  <span className="text-orange-400">&quot;{k}&quot;</span>
                  <span className="text-zinc-400">: </span>
                  {renderValue(v, k, fullKey)}
                  {i < entries.length - 1 && <span className="text-zinc-400">,</span>}
                </div>
              ))}
              <div>{indent}</div>
            </>
          )}
          {isCollapsed && <span className="text-zinc-500">...{entries.length} properties</span>}
          <span className="text-zinc-400">{'}'}</span>
        </span>
      )
    }
    
    return <span className="text-zinc-300">{String(value)}</span>
  }
  
  return <div className="font-mono text-xs">{renderValue(data, 'root')}</div>
}

interface TreeViewProps {
  tree: Record<string, TreeNode>
  selectedUrls: string[]
  onSelectionChange: (urls: string[]) => void
  onMapNode: (path: string) => Promise<void>
  mappingNodes: Set<string>
  expandedNodes: Set<string>
  onToggleNode: (path: string) => void
}

function TreeView({ tree, selectedUrls, onSelectionChange, onMapNode, mappingNodes, expandedNodes, onToggleNode }: TreeViewProps) {

  const toggleNode = (path: string) => {
    onToggleNode(path)
  }

  const getNodeUrls = (node: TreeNode): string[] => {
    const urls: string[] = [...node.urls]
    Object.values(node.children).forEach(child => {
      urls.push(...getNodeUrls(child))
    })
    return urls
  }

  const isNodeSelected = (node: TreeNode): 'full' | 'partial' | 'none' => {
    const nodeUrls = getNodeUrls(node)
    const selectedCount = nodeUrls.filter(url => selectedUrls.includes(url)).length
    
    if (selectedCount === 0) return 'none'
    if (selectedCount === nodeUrls.length) return 'full'
    return 'partial'
  }

  const toggleNodeSelection = (node: TreeNode) => {
    const nodeUrls = getNodeUrls(node)
    const isSelected = isNodeSelected(node) === 'full'
    
    if (isSelected) {
      onSelectionChange(selectedUrls.filter(url => !nodeUrls.includes(url)))
    } else {
      onSelectionChange([...new Set([...selectedUrls, ...nodeUrls])])
    }
  }

  const renderNode = (name: string, node: TreeNode, level: number = 0) => {
    const hasChildren = Object.keys(node.children).length > 0
    const isExpanded = expandedNodes.has(node.path)
    const selectionState = isNodeSelected(node)
    const isMapping = mappingNodes.has(node.path)
    
    // For root level, show the full domain name
    const displayName = level === 0 ? name : `/${name}`
    
    return (
      <div key={node.path} className={level === 0 ? '' : 'ml-6'}>
        <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-orange-50 rounded group">
          {hasChildren && (
            <button
              onClick={() => toggleNode(node.path)}
              className="w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-zinc-600"
            >
              <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          
          <label className="flex items-center gap-2 flex-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectionState === 'full'}
              ref={input => {
                if (input) input.indeterminate = selectionState === 'partial'
              }}
              onChange={() => toggleNodeSelection(node)}
              className="custom-checkbox"
            />
            <span className="text-sm font-medium text-zinc-700">{displayName}</span>
            {isMapping ? (
              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full animate-pulse">
                mapping...
              </span>
            ) : (
              <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                {node.count} {node.count === 1 ? 'page' : 'pages'}
              </span>
            )}
          </label>
          
          {/* Map button - show for any path that could be a directory */}
          {!isMapping && !node.path.match(/\.(html?|xml|json|txt|pdf|jpg|jpeg|png|gif|svg|css|js)$/i) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMapNode(node.path)
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
              title={`Map all pages under ${displayName}`}
            >
              Map
            </button>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {Object.entries(node.children)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([childName, childNode]) => 
                renderNode(childName, childNode, level + 1)
              )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-2">
      {Object.entries(tree).map(([name, node]) => renderNode(name, node))}
    </div>
  )
}

export default function ContentMigratorPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [sourceUrl, setSourceUrl] = useState('https://firecrawl.dev')
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('webflow')
  const [exportFormat, setExportFormat] = useState('webflow')
  const [showSuccess, setShowSuccess] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([
    { name: 'title', type: 'string' },
    { name: 'date', type: 'string' },
    { name: '', type: 'string' }
  ])

  const moveToStep = (step: Step) => {
    setCurrentStep(step)
  }

  const [crawlData, setCrawlData] = useState<Record<string, unknown>[]>([])
  const [saveRawResults] = useState(true)
  const [mapResults, setMapResults] = useState<string[]>([])
  const [selectedUrls, setSelectedUrls] = useState<string[]>([])
  const [isMapping, setIsMapping] = useState(false)
  const [mapProgress, setMapProgress] = useState('')
  const [mappingNodes, setMappingNodes] = useState<Set<string>>(new Set())
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [fieldPage, setFieldPage] = useState(0)
  const fieldsPerPage = 8
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree')
  const [batchSize, setBatchSize] = useState(50)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // Toggle node expansion
  const toggleNode = (path: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  // Map a specific node/path
  const handleMapNode = async (path: string) => {
    // Add to mapping set
    setMappingNodes(prev => new Set([...prev, path]))
    
    try {
      const response = await fetch('/api/map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: path,
          limit: 200
        })
      })
      
      const result = await response.json()
      
      if (result.success && Array.isArray(result.urls)) {
        // Filter URLs that start with the mapped path
        const pathUrls = result.urls.filter((url: string) => {
          try {
            const urlObj = new URL(url)
            const urlPath = urlObj.pathname
            const mappedPath = new URL(path).pathname
            return urlPath.startsWith(mappedPath)
          } catch {
            return false
          }
        })
        
        // If we only found one URL (the path itself), still process it
        // This allows recursive exploration even when a path has no immediate children
        const urlsToAdd = pathUrls.length > 0 ? pathUrls : [path]
        
        // Merge with existing results
        setMapResults(prev => {
          const combined = [...prev, ...urlsToAdd]
          return [...new Set(combined)] // Remove duplicates
        })
        
        // Auto-select new URLs under this path
        setSelectedUrls(prev => {
          const combined = [...prev, ...urlsToAdd]
          return [...new Set(combined)]
        })
        
        // Auto-expand the mapped node
        setExpandedNodes(prev => new Set([...prev, path]))
        
        // Recursively expand all parent nodes to ensure the new content is visible
        const expandParents = (nodePath: string) => {
          const parts = nodePath.split('/').filter(Boolean)
          let currentPath = ''
          const pathsToExpand: string[] = []
          
          for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : `https://${part}`
            pathsToExpand.push(currentPath)
          }
          
          setExpandedNodes(prev => new Set([...prev, ...pathsToExpand]))
        }
        
        expandParents(path)
      } else {
        throw new Error(result.error || 'Failed to map path')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to map path')
    } finally {
      // Remove from mapping set
      setMappingNodes(prev => {
        const newSet = new Set(prev)
        newSet.delete(path)
        return newSet
      })
    }
  }

  // Build tree structure from URLs
  const buildUrlTree = (urls: string[]) => {
    const tree: Record<string, TreeNode> = {}
    
    // Group URLs by normalized domain first
    const urlsByDomain: Record<string, string[]> = {}
    
    urls.forEach(url => {
      try {
        const urlObj = new URL(url)
        // Normalize domain (remove www. for grouping)
        const normalizedDomain = urlObj.hostname.replace(/^www\./, '')
        const domainKey = `${urlObj.protocol}//${normalizedDomain}`
        
        if (!urlsByDomain[domainKey]) {
          urlsByDomain[domainKey] = []
        }
        urlsByDomain[domainKey].push(url)
      } catch {
        // Invalid URL
      }
    })
    
    // Build tree for each domain group
    Object.entries(urlsByDomain).forEach(([domainKey, domainUrls]) => {
      const domainNode: TreeNode = {
        urls: [],
        children: {},
        count: 0,
        path: domainKey
      }
      
      domainUrls.forEach(url => {
        try {
          const urlObj = new URL(url)
          const pathParts = urlObj.pathname.split('/').filter(Boolean)
          
          // If it's the root path, count it for the domain
          if (pathParts.length === 0) {
            domainNode.urls.push(url)
          } else {
            // Build nested structure
            let current = domainNode.children
            let currentPath = domainKey
            
            pathParts.forEach((part, index) => {
              currentPath += '/' + part
              if (!current[part]) {
                current[part] = { 
                  urls: [], 
                  children: {},
                  count: 0,
                  path: currentPath
                }
              }
              
              // If it's the last part, add the URL
              if (index === pathParts.length - 1) {
                current[part].urls.push(url)
              }
              
              current = current[part].children
            })
          }
        } catch {
          // Invalid URL
        }
      })
      
      // Calculate total count for domain
      domainNode.count = domainUrls.length
      tree[domainKey] = domainNode
    })
    
    // Recalculate counts for all nodes
    const updateCounts = (node: TreeNode) => {
      let totalCount = node.urls.length
      Object.values(node.children).forEach((child: TreeNode) => {
        updateCounts(child)
        totalCount += child.count
      })
      node.count = totalCount
    }
    
    Object.values(tree).forEach(node => updateCounts(node))

    return tree
  }

  const analyzeWebsite = async () => {
    if (!sourceUrl) {
      alert('Please enter a URL')
      return
    }

    // Start fade transition
    setIsTransitioning(true)
    
    // Wait for fade out, then start mapping
    setTimeout(async () => {
      moveToStep(2)
      setIsTransitioning(false)
      
      // Automatically start mapping
      setIsMapping(true)
      setMapProgress('Mapping site structure...')
      
      try {
        const response = await fetch('/api/map', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: sourceUrl,
            limit: 200
          })
        })
        
        const result = await response.json()
        
        if (result.success && Array.isArray(result.urls)) {
          
          // Group URLs by their base path (without query params) to see duplicates
          const urlGroups: Record<string, string[]> = {}
          result.urls.forEach((url: string) => {
            try {
              const urlObj = new URL(url)
              const baseUrl = `${urlObj.origin}${urlObj.pathname}`
              if (!urlGroups[baseUrl]) {
                urlGroups[baseUrl] = []
              }
              urlGroups[baseUrl].push(url)
            } catch {
              // Invalid URL
            }
          })

          // Filter out duplicate URLs that only differ by query parameters
          const uniqueUrls = Array.from(new Set(
            result.urls.map((url: string) => {
              try {
                const urlObj = new URL(url)
                // Remove query parameters for deduplication
                return `${urlObj.origin}${urlObj.pathname}`
              } catch {
                return url
              }
            })
          ))
          
          
          setMapResults(uniqueUrls as string[])
          // Start with no URLs selected
          setSelectedUrls([])
          
          // Auto-expand root domains
          const tree = buildUrlTree(uniqueUrls as string[])
          const rootPaths = Object.values(tree).map(node => node.path)
          setExpandedNodes(new Set(rootPaths))
          
          // Clear loading state immediately
          setIsMapping(false)
          setMapProgress('')
        } else {
          throw new Error(result.error || 'Failed to map website')
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to map website')
        setIsMapping(false)
        setMapProgress('')
      }
    }, 500)
  }

  const addSchemaField = () => {
    setSchemaFields([...schemaFields, { name: '', type: 'string' }])
    // If we're adding the 9th field, move to the next page
    const newFieldCount = schemaFields.length + 1
    if (newFieldCount > fieldsPerPage && (newFieldCount - 1) % fieldsPerPage === 0) {
      setFieldPage(Math.floor((newFieldCount - 1) / fieldsPerPage))
    }
  }

  const removeSchemaField = (index: number) => {
    const newFields = schemaFields.filter((_, i) => i !== index)
    // Always ensure at least one empty field at the end
    if (newFields.length === 0 || newFields[newFields.length - 1].name !== '') {
      newFields.push({ name: '', type: 'string' })
    }
    setSchemaFields(newFields)
  }

  const updateSchemaField = (index: number, field: Partial<SchemaField>) => {
    const newFields = [...schemaFields]
    newFields[index] = { ...newFields[index], ...field }
    setSchemaFields(newFields)
  }

  const applyTemplate = (templateName: string) => {
    const templates: Record<string, SchemaField[]> = {
      shopify: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'price', type: 'string' },
        { name: 'vendor', type: 'string' },
        { name: 'product_type', type: 'string' },
        { name: 'tags', type: 'string' },
        { name: 'image_url', type: 'string' },
        { name: 'sku', type: 'string' },
        { name: 'inventory_quantity', type: 'number' },
        { name: '', type: 'string' } // Empty field for custom additions
      ],
      wordpress: [
        { name: 'title', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'author', type: 'string' },
        { name: 'publish_date', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'tags', type: 'string' },
        { name: 'featured_image', type: 'string' },
        { name: '', type: 'string' }
      ],
      woocommerce: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'price', type: 'string' },
        { name: 'regular_price', type: 'string' },
        { name: 'sale_price', type: 'string' },
        { name: 'sku', type: 'string' },
        { name: 'stock_quantity', type: 'number' },
        { name: 'category', type: 'string' },
        { name: 'image_url', type: 'string' },
        { name: '', type: 'string' }
      ],
      blog: [
        { name: 'title', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'date', type: 'string' },
        { name: 'author', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'tags', type: 'string' },
        { name: '', type: 'string' }
      ],
      ecommerce: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'price', type: 'string' },
        { name: 'image_url', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'availability', type: 'string' },
        { name: '', type: 'string' }
      ]
    }

    const template = templates[templateName]
    if (template) {
      setSchemaFields(template)
      setFieldPage(0) // Reset to first page
    }
  }

  const selectPlatform = (platform: Platform) => {
    setSelectedPlatform(platform)
    // Set appropriate export format based on platform
    switch (platform) {
      case 'wordpress':
        setExportFormat('wordpress')
        break
      case 'shopify':
        setExportFormat('shopify')
        break
      case 'webflow':
        setExportFormat('webflow')
        break
      case 'drupal':
        setExportFormat('drupal')
        break
      case 'csv':
        setExportFormat('csv')
        break
      case 'squarespace':
        setExportFormat('squarespace')
        break
      case 'wix':
        setExportFormat('wix')
        break
      case 'custom':
        setExportFormat('json')
        break
    }
    // Don't auto-advance - let user see the preview and decide
  }

  const startCrawl = async () => {
    if (!sourceUrl) {
      alert('Please enter a URL')
      return
    }

    // Check if URLs are selected
    if (selectedUrls.length === 0) {
      alert('Please map the site and select URLs to scrape')
      return
    }

    setLoading(true)
    
    let loadingInterval: NodeJS.Timeout | null = null
    
    setLoadingText(`Starting batch scrape of ${selectedUrls.length} pages...`)
    
    // Update loading text periodically
    loadingInterval = setInterval(() => {
      const messages = [
        `Extracting content from ${selectedUrls.length} pages...`,
        `Processing website data...`,
        `Applying schema to extracted content...`,
        `Organizing structured data...`
      ]
      const randomMessage = messages[Math.floor(Math.random() * messages.length)]
      setLoadingText(randomMessage)
    }, 3000)

    try {
      // Add AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout
      
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: sourceUrl,
          schema: schemaFields.filter(f => f.name).length > 0 ? getSchema() : undefined,
          autoInfer: schemaFields.filter(f => f.name).length === 0, // Auto-infer if no manual schema
          limit: selectedUrls.length,
          includeRaw: saveRawResults,
          strategy: 'mapCrawl',
          selectedUrls: selectedUrls
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      const result = await response.json()

      if (result.success) {
        setCrawlData(result.data)
        if (loadingInterval) {
          clearInterval(loadingInterval)
        }
        setLoading(false)
        moveToStep(3)
      } else {
        throw new Error(result.error || 'Failed to crawl')
      }
    } catch (error) {
      if (loadingInterval) {
        clearInterval(loadingInterval)
      }
      setLoading(false)
      if (error instanceof Error && error.name === 'AbortError') {
        alert('Crawl is taking longer than expected. Please try with fewer pages or check the URL.')
      } else {
        alert(error instanceof Error ? error.message : 'Failed to crawl website')
      }
    }
  }

  const startExport = async () => {
    if (crawlData.length === 0) {
      alert('Please crawl a website first')
      return
    }

    setLoading(true)
    setLoadingText('Formatting data for export...')
    
    setTimeout(async () => {
      // Check if we need to create multiple files
      const fileCount = Math.ceil(crawlData.length / batchSize)
      
      if (fileCount === 1) {
        // Single file export
        const exportData = formatExportData(crawlData, exportFormat)
        downloadFile(exportData, exportFormat)
      } else {
        // Multiple files - create a ZIP
        await downloadBatchedFiles(crawlData, batchSize, exportFormat)
      }
      
      setLoading(false)
      setShowSuccess(true)
    }, 1500)
  }

  const getExportPreview = (data: Record<string, unknown>[], format: string) => {
    const previewData = data // Show all items in preview
    
    switch (format) {
      case 'json':
      case 'webflow':
        const jsonData = format === 'json' ? previewData : { items: previewData }
        
        return (
          <div className="text-zinc-300 overflow-y-auto">
            <CollapsibleJSON data={jsonData} />
          </div>
        )
      case 'csv':
      case 'woocommerce':
      case 'shopify':
      case 'drupal':
      case 'wix':
        // For CSV preview, work directly with the data instead of parsing CSV string
        const headers = Object.keys(previewData[0] || {})
        
        return (
          <div className="overflow-x-hidden overflow-y-hidden">
            <table className="w-full font-mono text-xs table-fixed">
              <thead>
                <tr className="border-b border-zinc-700">
                  {headers.map((header, i) => (
                    <th key={i} className={`text-left px-3 py-2 text-orange-400 font-medium whitespace-nowrap ${
                      header === 'content' ? 'w-1/2' : 'w-1/6'
                    }`}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((item, i) => (
                  <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                    {headers.map((header, j) => {
                      const value = item[header]
                      let displayValue = String(value || '-')
                      
                      if (typeof value === 'string') {
                        // Clean up the content: remove newlines, excessive spaces, and truncate
                        displayValue = value
                          .replace(/\r?\n/g, ' ')  // Replace newlines with spaces
                          .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
                          .trim()                   // Remove leading/trailing spaces
                        
                        // Truncate long content
                        if (displayValue.length > 50) {
                          displayValue = displayValue.substring(0, 47) + '...'
                        }
                      }
                      
                      return (
                        <td key={j} className="px-3 py-2 text-zinc-300">
                          <div className="max-w-[250px] truncate whitespace-nowrap" title={String(value || '')}>
                            {displayValue}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      case 'wordpress':
      case 'squarespace':
        const xml = generateWordPressXML(previewData)
        return (
          <pre className="text-white font-mono text-xs overflow-x-hidden">
            <code>{xml}</code>
          </pre>
        )
      default:
        return (
          <div className="text-zinc-300 overflow-y-auto">
            <CollapsibleJSON data={previewData} />
          </div>
        )
    }
  }

  const formatExportData = (data: Record<string, unknown>[], format: string) => {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2)
      case 'shopify':
        return formatShopifyCSV(data)
      case 'csv':
      case 'woocommerce':
      case 'drupal':
      case 'wix':
        return convertToCSV(data)
      case 'wordpress':
      case 'squarespace':
        return generateWordPressXML(data)
      case 'webflow':
        return JSON.stringify({ items: data }, null, 2)
      default:
        return JSON.stringify(data, null, 2)
    }
  }

  const convertToCSV = (data: Record<string, unknown>[]) => {
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(item => 
      Object.values(item).map(value => {
        if (typeof value === 'string') {
          // Replace newlines with spaces and escape quotes
          const cleaned = value.replace(/\r?\n/g, ' ').replace(/"/g, '""')
          return `"${cleaned}"`
        }
        return value
      }).join(',')
    )
    
    return [headers, ...rows].join('\n')
  }

  const formatShopifyCSV = (data: Record<string, unknown>[]) => {
    if (data.length === 0) return ''
    
    // Shopify required columns in specific order
    const headers = [
      'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
      'Option1 Name', 'Option1 Value', 'Variant SKU', 'Variant Grams',
      'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
      'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price',
      'Variant Requires Shipping', 'Variant Taxable', 'Variant Barcode',
      'Image Src', 'Image Position', 'Image Alt Text', 'Gift Card',
      'SEO Title', 'SEO Description', 'Variant Weight Unit', 'Status'
    ]
    
    const rows = data.map((item, index) => {
      // Generate handle from title
      const title = String(item.title || `Product ${index + 1}`)
      const handle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      
      // Map scraped data to Shopify fields
      const row: Record<string, string> = {
        'Handle': handle,
        'Title': title,
        'Body (HTML)': String(item.description || item.content || ''),
        'Vendor': String(item.vendor || 'Default Vendor'),
        'Type': String(item.product_type || item.type || ''),
        'Tags': String(item.tags || ''),
        'Published': 'TRUE',
        'Option1 Name': 'Title',
        'Option1 Value': 'Default Title',
        'Variant SKU': String(item.sku || ''),
        'Variant Grams': String(item.weight || '0'),
        'Variant Inventory Tracker': 'shopify',
        'Variant Inventory Qty': String(item.inventory_quantity || item.stock || '0'),
        'Variant Inventory Policy': 'deny',
        'Variant Fulfillment Service': 'manual',
        'Variant Price': String(item.price || '0'),
        'Variant Compare At Price': String(item.compare_at_price || ''),
        'Variant Requires Shipping': 'TRUE',
        'Variant Taxable': 'TRUE',
        'Variant Barcode': String(item.barcode || ''),
        'Image Src': String(item.image_url || item.image || ''),
        'Image Position': item.image_url || item.image ? '1' : '',
        'Image Alt Text': item.image_url || item.image ? title : '',
        'Gift Card': 'FALSE',
        'SEO Title': title.substring(0, 70),
        'SEO Description': String(item.description || item.content || '').substring(0, 320),
        'Variant Weight Unit': 'g',
        'Status': 'active'
      }
      
      // Return values in correct order
      return headers.map(header => {
        const value = row[header]
        if (value.includes('"') || value.includes(',') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
        }
        return value
      }).join(',')
    })
    
    return [headers.join(','), ...rows].join('\n')
  }

  const generateWordPressXML = (data: Record<string, unknown>[]) => {
    // Format current date in WordPress format (YYYY-MM-DD HH:MM:SS)
    const now = new Date()
    const formatWPDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }
    
    const currentDate = formatWPDate(now)
    
    const items = data.map((item, index) => {
      // Extract content, fallback to description if content not available
      const content = item.content || item.description || ''
      const title = item.title || `Post ${index + 1}`
      
      // Use current date/time for all posts since the scraped dates are in various formats
      const postDate = currentDate
      const postDateGMT = currentDate // For simplicity, using same as local time
      
      return `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>https://example.com/?p=${index + 1}</link>
      <pubDate>${now.toUTCString()}</pubDate>
      <dc:creator><![CDATA[admin]]></dc:creator>
      <guid isPermaLink="false">https://example.com/?p=${index + 1}</guid>
      <description></description>
      <content:encoded><![CDATA[${content}]]></content:encoded>
      <excerpt:encoded><![CDATA[]]></excerpt:encoded>
      <wp:post_id>${index + 1}</wp:post_id>
      <wp:post_date><![CDATA[${postDate}]]></wp:post_date>
      <wp:post_date_gmt><![CDATA[${postDateGMT}]]></wp:post_date_gmt>
      <wp:post_modified><![CDATA[${postDate}]]></wp:post_modified>
      <wp:post_modified_gmt><![CDATA[${postDateGMT}]]></wp:post_modified_gmt>
      <wp:comment_status><![CDATA[closed]]></wp:comment_status>
      <wp:ping_status><![CDATA[closed]]></wp:ping_status>
      <wp:post_name><![CDATA[${(title as string).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}]]></wp:post_name>
      <wp:status><![CDATA[publish]]></wp:status>
      <wp:post_parent>0</wp:post_parent>
      <wp:menu_order>0</wp:menu_order>
      <wp:post_type><![CDATA[post]]></wp:post_type>
      <wp:post_password><![CDATA[]]></wp:post_password>
      <wp:is_sticky>0</wp:is_sticky>
      ${Object.entries(item).filter(([key]) => !['title', 'content', 'description', 'date'].includes(key)).map(([key, value]) => `
      <wp:postmeta>
        <wp:meta_key><![CDATA[${key}]]></wp:meta_key>
        <wp:meta_value><![CDATA[${value}]]></wp:meta_value>
      </wp:postmeta>`).join('')}
      ${item.date ? `
      <wp:postmeta>
        <wp:meta_key><![CDATA[original_date]]></wp:meta_key>
        <wp:meta_value><![CDATA[${item.date}]]></wp:meta_value>
      </wp:postmeta>` : ''}
    </item>`
    }).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- This is a WordPress eXtended RSS file generated by Firecrawl Content Migrator -->
<!-- It contains information about your site's posts, pages, comments, categories, and other content -->
<!-- You may use this file to transfer that content from one site to another -->
<!-- This file is not intended to serve as a complete backup of your site -->

<!-- generator="Firecrawl Content Migrator" created="${currentDate}" -->
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/"
>
  <channel>
    <title>Imported Content</title>
    <link>https://example.com</link>
    <description>Content imported from Firecrawl</description>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <language>en-US</language>
    <wp:wxr_version>1.2</wp:wxr_version>
    <wp:base_site_url>https://example.com</wp:base_site_url>
    <wp:base_blog_url>https://example.com</wp:base_blog_url>
    
    <wp:author>
      <wp:author_id>1</wp:author_id>
      <wp:author_login><![CDATA[admin]]></wp:author_login>
      <wp:author_email><![CDATA[admin@example.com]]></wp:author_email>
      <wp:author_display_name><![CDATA[Admin]]></wp:author_display_name>
      <wp:author_first_name><![CDATA[]]></wp:author_first_name>
      <wp:author_last_name><![CDATA[]]></wp:author_last_name>
    </wp:author>
    
    <generator>https://firecrawl.dev/?v=1.0</generator>
${items}
  </channel>
</rss>`
  }

  const downloadFile = (content: string, format: string, filename?: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    
    const extensions: Record<string, string> = {
      json: 'json',
      csv: 'csv',
      wordpress: 'xml',
      woocommerce: 'csv',
      shopify: 'csv',
      webflow: 'json',
      drupal: 'csv',
      bigcommerce: 'csv',
      squarespace: 'xml',
      wix: 'csv'
    }
    
    a.download = filename || `export-${Date.now()}.${extensions[format] || 'txt'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadBatchedFiles = async (data: Record<string, unknown>[], size: number, format: string) => {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    
    const batches = []
    for (let i = 0; i < data.length; i += size) {
      batches.push(data.slice(i, i + size))
    }

    const extensions: Record<string, string> = {
      json: 'json',
      csv: 'csv',
      wordpress: 'xml',
      woocommerce: 'csv',
      shopify: 'csv',
      webflow: 'json',
      drupal: 'csv',
      squarespace: 'xml',
      wix: 'csv'
    }

    const timestamp = Date.now()
    const ext = extensions[format] || 'txt'

    // Add each batch to the ZIP file
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const exportData = formatExportData(batch, format)
      const filename = `export-part${i + 1}.${ext}`
      
      zip.file(filename, exportData)
    }
    
    // Generate and download the ZIP file
    const zipContent = await zip.generateAsync({ type: 'blob' })
    const zipUrl = URL.createObjectURL(zipContent)
    const a = document.createElement('a')
    a.href = zipUrl
    a.download = `export-${timestamp}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(zipUrl)
  }


  const getSchema = () => {
    const properties: Record<string, { type: string }> = {}
    schemaFields.forEach(field => {
      if (field.name) {
        // Convert spaces to underscores in field names for JSON compatibility
        const safeName = field.name.replace(/\s+/g, '_')
        properties[safeName] = { type: field.type }
      }
    })
    return {
      type: 'object',
      properties
    }
  }

  return (
    <Layout>
      <Header ctaHref="https://github.com/new?template_name=firecrawl-content-migrator&template_owner=mendableai" />
      
      <Hero 
        title="Firecrawl Content Migrator"
        subtitle="Turn any website into structured CMS-ready data in seconds"
      />
      
      {/* Animated Transformation Visualization */}
      <div className={`pb-6 px-4 transition-opacity duration-500 ${currentStep >= 2 || isTransitioning ? 'opacity-0' : 'opacity-100'} ${currentStep >= 2 ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto">
          <div className="bg-zinc-900 rounded-2xl p-8 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Crawling Stage */}
              <div className="animate-fade-in">
                <div className="text-xs text-zinc-400 mb-4 font-semibold uppercase tracking-wider">Step 1: Map & Select Pages</div>
                <div className="bg-black rounded-xl p-4 border border-zinc-800">
                  <div className="h-48 relative overflow-hidden">
                    <div className="absolute inset-0 animate-crawl-urls">
                      <div className="space-y-2 font-mono text-xs">
                        <div className="text-orange-600 font-bold mb-1">Mapping site structure...</div>
                        <div className="text-zinc-500">► https://firecrawl.dev</div>
                        <div className="text-zinc-400 ml-4">├─ /blog</div>
                        <div className="text-orange-500 ml-8">├─ /2025/openai-launches-gpt5</div>
                        <div className="text-orange-500 ml-8">├─ /2025/apple-vision-pro-2</div>
                        <div className="text-orange-500 ml-8">├─ /2025/tesla-robotaxi-fleet</div>
                        <div className="text-zinc-400 ml-4">├─ /docs</div>
                        <div className="text-zinc-400 ml-4">├─ /pricing</div>
                        <div className="text-zinc-400 ml-4">└─ /api</div>
                        <div className="text-orange-600 font-bold mt-2">5 pages selected</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">Selected Pages: <span className="text-orange-500">5</span></span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-zinc-500">Mapping</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Extract Stage */}
              <div className="animate-fade-in" style={{ animationDelay: '0.7s' }}>
                <div className="text-xs text-zinc-400 mb-4 font-semibold uppercase tracking-wider">Step 2: Batch Scrape & Extract</div>
                <div className="bg-black rounded-xl p-4 border border-zinc-800">
                  <div className="h-48 relative overflow-hidden">
                    <div className="absolute inset-0 animate-extract-data p-2">
                      <div className="relative h-full">
                        <div className="absolute inset-0 opacity-0 animate-fade-cycle-4">
                          <div className="font-mono text-sm space-y-2">
                            <div><span className="text-orange-500 font-bold">title:</span> <span className="text-white">&quot;OpenAI Launches GPT-5&quot;</span></div>
                            <div><span className="text-orange-500 font-bold">date:</span> <span className="text-white">&quot;2025-01-22&quot;</span></div>
                            <div><span className="text-orange-500 font-bold">content:</span> <span className="text-white">&quot;Major breakthrough in...&quot;</span></div>
                          </div>
                        </div>
                        <div className="absolute inset-0 opacity-0 animate-fade-cycle-4" style={{ animationDelay: '2s' }}>
                          <div className="font-mono text-sm space-y-2">
                            <div><span className="text-orange-500 font-bold">title:</span> <span className="text-white">&quot;Apple Vision Pro 2 Revealed&quot;</span></div>
                            <div><span className="text-orange-500 font-bold">date:</span> <span className="text-white">&quot;2025-01-21&quot;</span></div>
                            <div><span className="text-orange-500 font-bold">content:</span> <span className="text-white">&quot;Revolutionary AR headset...&quot;</span></div>
                          </div>
                        </div>
                      <div className="absolute inset-0 opacity-0 animate-fade-cycle-4" style={{ animationDelay: '4s' }}>
                        <div className="font-mono text-sm space-y-1">
                          <div className="text-orange-500">title: <span className="text-white">&quot;Tesla Robotaxi Fleet Live&quot;</span></div>
                          <div className="text-orange-500">date: <span className="text-white">&quot;2025-01-20&quot;</span></div>
                          <div className="text-orange-500">content: <span className="text-white">&quot;Autonomous vehicles hit...&quot;</span></div>
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 animate-fade-cycle-4" style={{ animationDelay: '6s' }}>
                        <div className="font-mono text-sm space-y-1">
                          <div className="text-orange-500">title: <span className="text-white">&quot;Meta AI Assistant Update&quot;</span></div>
                          <div className="text-orange-500">date: <span className="text-white">&quot;2025-01-19&quot;</span></div>
                          <div className="text-orange-500">content: <span className="text-white">&quot;New features include...&quot;</span></div>
                        </div>
                      </div>
                      </div>
                    </div>
                  </div>
                </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">Extracted: <span className="text-orange-500 tabular-nums">5</span> pages</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-zinc-500">Batch Processing</span>
                    </div>
                  </div>
                </div>
              </div>
       
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Step 3: Export</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Exported: <span className="text-orange-500 tabular-nums">127</span></span>
                  <span className="text-xs text-zinc-500">• JSON • XML • CSV</span>
                </div>
              </div>
                <div className="bg-black rounded-xl p-4 border border-zinc-800">
                  <div className="h-32 relative overflow-hidden mb-2">
                  <div className="absolute inset-0 animate-rotate-formats">
                    <div className="relative h-full">
                      {/* JSON Structure */}
                      <div className="absolute inset-0 flex items-start gap-4 opacity-0">
                        <div className="flex-1 font-mono text-xs">
                          <div className="text-zinc-400">{'[{'}</div>
                          <div className="pl-2"><span className="text-orange-500 font-bold">&quot;title&quot;</span><span className="text-zinc-400">:</span> <span className="text-white">&quot;OpenAI Launches GPT-5&quot;</span><span className="text-zinc-400">,</span></div>
                          <div className="pl-2"><span className="text-orange-500 font-bold">&quot;date&quot;</span><span className="text-zinc-400">:</span> <span className="text-white">&quot;2025-01-22&quot;</span><span className="text-zinc-400">,</span></div>
                          <div className="pl-2"><span className="text-orange-500 font-bold">&quot;content&quot;</span><span className="text-zinc-400">:</span> <span className="text-white">&quot;Major breakthrough in...&quot;</span><span className="text-zinc-400">,</span></div>
                          <div className="pl-2"><span className="text-orange-500 font-bold">&quot;author&quot;</span><span className="text-zinc-400">:</span> <span className="text-white">&quot;Sarah Chen&quot;</span></div>
                          <div className="text-zinc-400">{'}'}{']'}</div>
                        </div>
                      </div>
                      
                      {/* WordPress XML */}
                      <div className="absolute inset-0 flex items-start gap-4 opacity-0">
                        <div className="flex-1 font-mono text-xs">
                          <div className="text-orange-600">&lt;rss version=&quot;2.0&quot;&gt;</div>
                          <div className="pl-2 text-orange-600">&lt;channel&gt;</div>
                          <div className="pl-4 text-orange-600">&lt;item&gt;</div>
                          <div className="pl-6 text-white">&lt;title&gt;OpenAI Launches GPT-5&lt;/title&gt;</div>
                          <div className="pl-6 text-white">&lt;wp:post_date&gt;2025-01-22&lt;/wp:post_date&gt;</div>
                          <div className="pl-6 text-white">&lt;content:encoded&gt;Major breakthrough...&lt;/content:encoded&gt;</div>
                          <div className="pl-4 text-orange-600">&lt;/item&gt;</div>
                        </div>
                      </div>
                      
                      {/* Shopify CSV */}
                      <div className="absolute inset-0 flex items-start gap-4 opacity-0">
                        <div className="flex-1 font-mono text-xs">
                          <div className="text-orange-500 font-bold text-xs">Title,Date,Content,Tags,Author</div>
                          <div className="text-white text-xs">&quot;OpenAI Launches GPT-5&quot;,&quot;2025-01-22&quot;,&quot;Major breakthrough...&quot;,&quot;AI|Technology&quot;,&quot;Sarah Chen&quot;</div>
                          <div className="text-white text-xs">&quot;Apple Vision Pro 2&quot;,&quot;2025-01-21&quot;,&quot;Revolutionary AR...&quot;,&quot;AR|Apple&quot;,&quot;John Doe&quot;</div>
                        </div>
                      </div>
                      
                      {/* Webflow JSON */}
                      <div className="absolute inset-0 flex items-start gap-4 opacity-0">
                        <div className="flex-1 font-mono text-xs">
                          <div className="text-orange-600">{'{'}</div>
                          <div className="pl-2 text-orange-600">&quot;items&quot;<span className="text-white">: {'[{'}</span></div>
                          <div className="pl-4 text-orange-600">&quot;name&quot;<span className="text-white">: &quot;OpenAI Launches GPT-5&quot;,</span></div>
                          <div className="pl-4 text-orange-600">&quot;slug&quot;<span className="text-white">: &quot;openai-launches-gpt-5&quot;,</span></div>
                          <div className="pl-4 text-orange-600">&quot;date&quot;<span className="text-white">: &quot;2025-01-22&quot;,</span></div>
                          <div className="pl-4 text-orange-600">&quot;content&quot;<span className="text-white">: &quot;Major breakthrough...&quot;</span></div>
                          <div className="pl-2">{'}'}{']'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                </div>
            </div>
          </div>
        </div>
      </div>
      
      <MainContent maxWidth="7xl" className="py-4">
        <div className="space-y-8">
          {/* Main Panel - Configuration */}
          <div className="">
            {/* Step 1: Analyze Website */}
            {currentStep === 1 && (
              <div className="max-w-2xl mx-auto">
                <div className="flex justify-center">
                  <div className={`transition-all duration-500 ease-in-out ${!showUrlInput ? 'w-auto' : 'w-full max-w-2xl'}`}>
                    {!showUrlInput ? (
                      <Button
                        variant="code"
                        onClick={() => setShowUrlInput(true)}
                        className="px-8 animate-fade-in"
                      >
                        Get Started
                      </Button>
                    ) : (
                      <div className="bg-zinc-200 rounded-full p-0.5 animate-fade-in">
                        <div className="relative flex items-center">
                          <Input
                            id="sourceUrl"
                            type="url"
                            value={sourceUrl}
                            onChange={(e) => setSourceUrl(e.target.value)}
                            placeholder="https://example.com/blog"
                            className="flex-1 h-12 text-base px-6 pr-16 bg-white rounded-full border-0 focus:ring-2 focus:ring-orange-500"
                            onKeyPress={(e) => e.key === 'Enter' && analyzeWebsite()}
                            autoFocus
                          />
                          <button 
                            onClick={analyzeWebsite}
                            className="absolute right-1 w-11 h-11 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M3 8h10m0 0l-3.5-3.5M13 8l-3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Customize Schema */}
            {currentStep === 2 && loading && (
              <div className="animate-fade-in">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Skeleton for Select Target Platform */}
                  <div className="bg-zinc-50 rounded-xl p-6">
                    <h3 className="font-semibold mb-4">Select Target Platform</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="p-6 bg-white border border-zinc-200 rounded-lg relative overflow-hidden">
                        <div className="relative flex justify-center items-center h-16">
                          <div className="h-10 w-16 bg-zinc-200 rounded animate-pulse"></div>
                          <span className="absolute bottom-0 right-0 text-[10px] font-mono font-medium text-zinc-300">.---</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 flex justify-center gap-3">
                    <div className="h-10 bg-zinc-200 rounded-lg w-32 animate-pulse"></div>
                    <div className="h-10 bg-orange-200 rounded-lg w-40 animate-pulse"></div>
                  </div>
                  </div>
                
                {/* Skeleton for Export Preview */}
                <div className="bg-zinc-50 rounded-xl p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Export Preview</h3>
                    <span className="text-sm font-medium text-zinc-600">Items: <span className="inline-block h-4 bg-zinc-200 rounded w-8 animate-pulse"></span></span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-4 h-full overflow-hidden relative">
                      {/* Loading text overlay */}
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <p className="text-zinc-400 text-sm font-medium animate-pulse">
                          {loadingText}
                        </p>
                      </div>
                      
                      {/* Skeleton lines */}
                      <div className="space-y-2 h-full">
                        <div className="h-2 bg-zinc-800 rounded w-full animate-pulse"></div>
                        <div className="h-2 bg-zinc-800 rounded w-4/5 animate-pulse" style={{animationDelay: '50ms'}}></div>
                        <div className="h-2 bg-zinc-800 rounded w-5/6 animate-pulse" style={{animationDelay: '100ms'}}></div>
                        <div className="h-2 bg-zinc-800 rounded w-3/4 animate-pulse" style={{animationDelay: '150ms'}}></div>
                        <div className="h-2 bg-zinc-800 rounded w-full animate-pulse" style={{animationDelay: '200ms'}}></div>
                        <div className="h-2 bg-zinc-800 rounded w-2/3 animate-pulse" style={{animationDelay: '250ms'}}></div>
                        <div className="h-2 bg-zinc-800 rounded w-5/6 animate-pulse" style={{animationDelay: '300ms'}}></div>
                        <div className="h-2 bg-zinc-800 rounded w-3/5 animate-pulse" style={{animationDelay: '350ms'}}></div>
                        <div className="h-2 bg-zinc-800 rounded w-full animate-pulse" style={{animationDelay: '650ms'}}></div>
                        <div className="h-2 bg-zinc-800 rounded w-4/5 animate-pulse" style={{animationDelay: '700ms'}}></div>
                        <div className="h-2 bg-zinc-800 rounded w-3/5 animate-pulse" style={{animationDelay: '750ms'}}></div>
                        <div className="h-2 bg-zinc-800 rounded w-5/6 animate-pulse" style={{animationDelay: '800ms'}}></div>
                        <div className="h-2 bg-zinc-800 rounded w-2/3 animate-pulse" style={{animationDelay: '850ms'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}
            
            {/* Step 2: Customize Schema */}
            {currentStep === 2 && !loading && (
              <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  {/* Left Column - Data Fields */}
                  <div className="bg-zinc-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">Data Fields</h3>
                        <div className="mt-2">
                          <select
                            onChange={(e) => {
                              const templateName = e.target.value
                              if (templateName) {
                                applyTemplate(templateName)
                                e.target.value = '' // Reset select
                              }
                            }}
                            className="text-sm bg-white border border-zinc-300 rounded-lg px-3 py-1.5 text-zinc-700 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-20 cursor-pointer"
                          >
                            <option value="">Apply Template...</option>
                            <option value="shopify">Shopify Products</option>
                            <option value="wordpress">WordPress Posts</option>
                            <option value="woocommerce">WooCommerce Products</option>
                            <option value="blog">Blog Posts</option>
                            <option value="ecommerce">E-commerce Generic</option>
                          </select>
                        </div>
                      </div>
                      <span className="text-sm text-zinc-500">{schemaFields.length} fields</span>
                    </div>
                    
                    <div className="bg-white rounded-lg border border-zinc-300 overflow-hidden">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-zinc-100 border-b border-zinc-300">
                            <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600 uppercase tracking-wider">Field Name</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600 uppercase tracking-wider">Type</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {schemaFields
                            .slice(fieldPage * fieldsPerPage, (fieldPage + 1) * fieldsPerPage)
                            .map((field, index) => {
                              const actualIndex = fieldPage * fieldsPerPage + index
                              return (
                                <tr key={actualIndex} className="border-b border-zinc-200 group">
                                  <td className="p-0 border-r border-zinc-200">
                                    <input
                                      type="text"
                                      placeholder="field_name"
                                      value={field.name}
                                      onChange={(e) => {
                                        updateSchemaField(actualIndex, { name: e.target.value })
                                        // Auto-add new field when typing in the last empty field
                                        if (actualIndex === schemaFields.length - 1 && e.target.value && !schemaFields[actualIndex].name) {
                                          addSchemaField()
                                        }
                                      }}
                                      onFocus={(e) => {
                                        // Ensure the input is properly focused
                                        e.target.select()
                                      }}
                                      className="w-full px-3 py-2 text-sm bg-transparent outline-none focus:bg-orange-50 transition-colors focus:ring-2 focus:ring-orange-500 focus:ring-opacity-20"
                                    />
                                  </td>
                                  <td className="p-0 border-r border-zinc-200">
                                    {field.name ? (
                                      <select
                                        value={field.type}
                                        onChange={(e) => updateSchemaField(actualIndex, { type: e.target.value as SchemaField['type'] })}
                                        className="w-full px-3 py-2 text-sm bg-transparent outline-none focus:bg-orange-50 transition-colors cursor-pointer"
                                      >
                                        <option value="string">Text</option>
                                        <option value="number">Number</option>
                                        <option value="boolean">True/False</option>
                                        <option value="array">List</option>
                                      </select>
                                    ) : (
                                      <div className="h-[38px]"></div>
                                    )}
                                  </td>
                                  <td className="p-0 text-center">
                                    {field.name ? (
                                      <button
                                        onClick={() => removeSchemaField(actualIndex)}
                                        className="text-zinc-400 hover:text-red-500 transition-colors text-xs px-2 py-2"
                                        title="Remove field"
                                      >
                                        ✕
                                      </button>
                                    ) : (
                                      <div className="h-[38px]"></div>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          {/* Empty rows to maintain consistent height */}
                          {schemaFields.slice(fieldPage * fieldsPerPage, (fieldPage + 1) * fieldsPerPage).length < fieldsPerPage && 
                            Array.from({ length: fieldsPerPage - schemaFields.slice(fieldPage * fieldsPerPage, (fieldPage + 1) * fieldsPerPage).length }).map((_, idx) => (
                              <tr key={`empty-${idx}`} className="border-b border-zinc-200">
                                <td className="p-0 border-r border-zinc-200 h-[38px]"></td>
                                <td className="p-0 border-r border-zinc-200"></td>
                                <td className="p-0"></td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      
                      {schemaFields.length > fieldsPerPage && (
                        <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-t border-zinc-200">
                          <span className="text-sm text-zinc-600">
                            Showing {fieldPage * fieldsPerPage + 1}-{Math.min((fieldPage + 1) * fieldsPerPage, schemaFields.length)} of {schemaFields.length}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="default"
                              onClick={() => setFieldPage(Math.max(0, fieldPage - 1))}
                              disabled={fieldPage === 0}
                              className="bg-zinc-900 hover:bg-zinc-800 text-white"
                            >
                              Previous
                            </Button>
                            <Button
                              variant="secondary"
                              size="default"
                              onClick={() => setFieldPage(Math.min(Math.ceil(schemaFields.length / fieldsPerPage) - 1, fieldPage + 1))}
                              disabled={(fieldPage + 1) * fieldsPerPage >= schemaFields.length}
                              className="bg-zinc-900 hover:bg-zinc-800 text-white"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                  </div>
                  {/* Right Column - Page Selection */}
                  <div className="bg-zinc-50 rounded-xl p-6 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="font-semibold text-lg">Page Selection</h3>
                      {isMapping && (
                        <div className="inline-flex items-center gap-2 text-orange-600">
                          <div className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse"></div>
                          <p className="text-sm font-medium">{mapProgress || 'Mapping site structure...'}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Map Results Table */}
                    {mapResults.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold">Select Pages</h4>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-zinc-500">Found {mapResults.length} pages</span>
                            <div className="flex bg-zinc-100 rounded-lg p-0.5">
                              <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                                  viewMode === 'list' 
                                    ? 'bg-white text-zinc-900 shadow-sm' 
                                    : 'text-zinc-600 hover:text-zinc-900'
                                }`}
                              >
                                List
                              </button>
                              <button
                                onClick={() => setViewMode('tree')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                                  viewMode === 'tree' 
                                    ? 'bg-white text-zinc-900 shadow-sm' 
                                    : 'text-zinc-600 hover:text-zinc-900'
                                }`}
                              >
                                Tree
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mb-4">
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedUrls(mapResults)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-white text-sm px-3 py-1"
                          >
                            Select All
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedUrls([])}
                            className="bg-zinc-900 hover:bg-zinc-800 text-white text-sm px-3 py-1"
                          >
                            Clear All
                          </Button>
                        </div>
                        
                        <div className="bg-white rounded-lg border border-zinc-300 overflow-hidden mb-4">
                          <div className="max-h-64 overflow-y-auto">
                            {viewMode === 'list' ? (
                              // List View
                              mapResults.map((url, index) => (
                                <label key={index} className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50 cursor-pointer border-b border-zinc-200 last:border-b-0">
                                  <input
                                    type="checkbox"
                                    checked={selectedUrls.includes(url)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedUrls([...selectedUrls, url])
                                      } else {
                                        setSelectedUrls(selectedUrls.filter(u => u !== url))
                                      }
                                    }}
                                    className="custom-checkbox"
                                  />
                                  <span className="text-sm text-zinc-700 truncate flex-1">{url}</span>
                                </label>
                              ))
                            ) : (
                              // Tree View
                              <TreeView 
                                tree={buildUrlTree(mapResults)}
                                selectedUrls={selectedUrls}
                                onSelectionChange={setSelectedUrls}
                                onMapNode={handleMapNode}
                                mappingNodes={mappingNodes}
                                expandedNodes={expandedNodes}
                                onToggleNode={toggleNode}
                              />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-600">
                            <strong>{selectedUrls.length}</strong> pages selected
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Show loading state while mapping */}
                    {isMapping && (
                      <div className="py-4">
                        {/* Tree skeleton loader */}
                        <div className="bg-white rounded-lg border border-zinc-300 overflow-hidden">
                          <div className="p-4 space-y-3">
                            {/* Root domain skeleton */}
                            <div className="flex items-center gap-2 py-1.5 px-2">
                              <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                              <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                              <div className="h-4 bg-zinc-200 rounded w-32 animate-pulse"></div>
                              <div className="h-4 bg-zinc-100 rounded-full w-16 animate-pulse ml-2"></div>
                            </div>
                            
                            {/* Child items skeleton */}
                            <div className="ml-6 space-y-3">
                              <div className="flex items-center gap-2 py-1.5 px-2">
                                <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                                <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                                <div className="h-4 bg-zinc-200 rounded w-24 animate-pulse" style={{animationDelay: '100ms'}}></div>
                                <div className="h-4 bg-zinc-100 rounded-full w-14 animate-pulse ml-2" style={{animationDelay: '100ms'}}></div>
                              </div>
                              
                              {/* Nested items skeleton */}
                              <div className="ml-6 space-y-3">
                                <div className="flex items-center gap-2 py-1.5 px-2">
                                  <div className="w-4"></div>
                                  <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                                  <div className="h-4 bg-zinc-200 rounded w-40 animate-pulse" style={{animationDelay: '200ms'}}></div>
                                </div>
                                <div className="flex items-center gap-2 py-1.5 px-2">
                                  <div className="w-4"></div>
                                  <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                                  <div className="h-4 bg-zinc-200 rounded w-36 animate-pulse" style={{animationDelay: '300ms'}}></div>
                                </div>
                                <div className="flex items-center gap-2 py-1.5 px-2">
                                  <div className="w-4"></div>
                                  <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                                  <div className="h-4 bg-zinc-200 rounded w-44 animate-pulse" style={{animationDelay: '400ms'}}></div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 py-1.5 px-2">
                                <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                                <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                                <div className="h-4 bg-zinc-200 rounded w-20 animate-pulse" style={{animationDelay: '500ms'}}></div>
                                <div className="h-4 bg-zinc-100 rounded-full w-14 animate-pulse ml-2" style={{animationDelay: '500ms'}}></div>
                              </div>
                              
                              <div className="flex items-center gap-2 py-1.5 px-2">
                                <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                                <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                                <div className="h-4 bg-zinc-200 rounded w-28 animate-pulse" style={{animationDelay: '600ms'}}></div>
                                <div className="h-4 bg-zinc-100 rounded-full w-14 animate-pulse ml-2" style={{animationDelay: '600ms'}}></div>
                              </div>
                              
                              <div className="flex items-center gap-2 py-1.5 px-2">
                                <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                                <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse"></div>
                                <div className="h-4 bg-zinc-200 rounded w-16 animate-pulse" style={{animationDelay: '700ms'}}></div>
                                <div className="h-4 bg-zinc-100 rounded-full w-14 animate-pulse ml-2" style={{animationDelay: '700ms'}}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Show message when no pages yet */}
                    {!isMapping && mapResults.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm text-zinc-500">Mapping will begin automatically...</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4 max-w-md mx-auto">
                  <Button
                    variant="default"
                    onClick={() => moveToStep(1)}
                    className="flex-1"
                  >
                    ← Back
                  </Button>
                  <Button
                    variant="orange"
                    onClick={startCrawl}
                    className="flex-1"
                    disabled={
                      schemaFields.filter(f => f.name).length === 0 || 
                      selectedUrls.length === 0
                    }
                  >
                    Start Scraping →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Select Platform */}
            {currentStep === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-50 rounded-xl p-6">
                  <h3 className="font-semibold mb-4">Select Target Platform</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'webflow', name: 'Webflow', icon: '/svg/webflow.svg', fileType: '.json' },
                      { id: 'wordpress', name: 'WordPress', icon: '/svg/wordpress.svg', fileType: '.xml' },
                      { id: 'shopify', name: 'Shopify', icon: '/svg/shopify.svg', fileType: '.csv' },
                      { id: 'drupal', name: 'Drupal', icon: '/drupal.png', fileType: '.csv' },
                      { id: 'squarespace', name: 'Squarespace', icon: '/squarespace.jpg', fileType: '.xml' },
                      { id: 'wix', name: 'Wix', icon: '/wix.png', fileType: '.csv' },
                      { id: 'csv', name: 'CSV', icon: '/csv-file-icon.svg', fileType: '.csv' },
                      { id: 'custom', name: 'JSON', icon: '/json-file-icon.svg', fileType: '.json' },
                    ].map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => selectPlatform(platform.id as Platform)}
                        className={`
                          p-6 bg-white border rounded-lg transition-all group relative overflow-hidden
                          ${selectedPlatform === platform.id 
                            ? 'border-orange-500 shadow-md ring-2 ring-orange-500/20' 
                            : 'border-zinc-300 hover:border-orange-300 hover:shadow-sm'
                          }
                        `}
                      >
                        <div className="relative flex justify-center items-center h-16">
                          {platform.icon ? (
                            <Image 
                              src={platform.icon} 
                              alt={`${platform.name} logo`}
                              width={platform.id === 'csv' || platform.id === 'custom' ? 64 : 40}
                              height={platform.id === 'csv' || platform.id === 'custom' ? 64 : 40}
                              className={`${
                                platform.id === 'webflow' ? 'h-6 w-auto' : 
                                platform.id === 'wix' ? 'h-8 w-auto' : 
                                platform.id === 'csv' || platform.id === 'custom' ? 'h-16 w-auto' : 
                                'h-10 w-auto'
                              } transition-transform group-hover:scale-105 ${
                                selectedPlatform === platform.id ? 'scale-105' : ''
                              }`}
                            />
                          ) : (
                            <span className={`text-2xl font-semibold text-zinc-700 transition-transform group-hover:scale-105 ${
                              selectedPlatform === platform.id ? 'scale-105 text-orange-600' : ''
                            }`}>
                              {platform.name}
                            </span>
                          )}
                          <span className={`absolute bottom-0 right-0 text-[10px] font-mono font-medium transition-colors ${
                            selectedPlatform === platform.id ? 'text-orange-600' : 'text-zinc-500'
                          }`}>
                            {platform.fileType}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-8 flex justify-center gap-3">
                    <Button
                      variant="code"
                      onClick={() => {
                        // Reset state for new export
                        setSourceUrl('https://firecrawl.dev')
                        setSelectedPlatform('webflow')
                        setExportFormat('webflow')
                        setCrawlData([])
                        setMapResults([])
                        setSelectedUrls([])
                        setSchemaFields([
                          { name: 'title', type: 'string' },
                          { name: 'date', type: 'string' },
                          { name: '', type: 'string' }
                        ])
                        setShowSuccess(false)
                        setShowExportOptions(false)
                        moveToStep(1)
                      }}
                      className="px-8"
                    >
                      Start New Export
                    </Button>
                    <Button
                      variant="orange"
                      onClick={() => {
                        setShowExportOptions(true)
                      }}
                      className="px-8"
                    >
                      Continue to Export →
                    </Button>
                  </div>
                </div>
                
                {/* Right: Preview or Export Options */}
                <div className="bg-zinc-50 rounded-xl p-6 flex flex-col">
                  {!showExportOptions ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Export Preview</h3>
                        <span className="text-sm font-medium text-zinc-600">Items: {crawlData.length}</span>
                      </div>
                      
                      {crawlData.length > 0 ? (
                        <div className="flex-1">
                          <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-4 h-full overflow-hidden">
                            <div className="h-full overflow-y-auto text-xs">
                              {getExportPreview(crawlData, exportFormat)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl mb-3">CSV</div>
                            <p className="text-sm text-zinc-500">No data scraped yet</p>
                            <p className="text-xs text-zinc-400 mt-1">Complete the scraping process to see a preview</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Export Configuration</h3>
                        <Button
                          variant="code"
                          onClick={() => setShowExportOptions(false)}
                          className="h-8 px-3 text-xs"
                        >
                          ← Back to Preview
                        </Button>
                      </div>
                      
                      <div className="flex-1 flex items-center">
                        <div className="w-full space-y-6">
                          <div>
                            <Label htmlFor="exportFormat">Export Format</Label>
                            <Select
                              id="exportFormat"
                              value={exportFormat}
                              onChange={(e) => setExportFormat(e.target.value)}
                              className="mt-2"
                            >
                              <option value="wordpress">WordPress WXR (XML)</option>
                              <option value="woocommerce">WooCommerce CSV</option>
                              <option value="shopify">Shopify Products CSV</option>
                              <option value="webflow">Webflow CMS JSON</option>
                              <option value="drupal">Drupal CSV</option>
                              <option value="squarespace">Squarespace XML</option>
                              <option value="wix">Wix CSV</option>
                              <option value="csv">Generic CSV</option>
                              <option value="json">Generic JSON</option>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="batchSize">Items per file</Label>
                            <div className="flex items-center gap-2 mt-2">
                              <Input
                                id="batchSize"
                                type="number"
                                value={batchSize}
                                onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 50))}
                                placeholder="Items per file"
                                min="1"
                                className="flex-1"
                              />
                              <span className="text-sm text-zinc-500">
                                = {Math.ceil(crawlData.length / batchSize)} file{Math.ceil(crawlData.length / batchSize) !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">
                              Will create a ZIP with multiple files if needed
                            </p>
                          </div>
                          
                          <div className="flex justify-center">
                            <Button 
                              variant="orange" 
                              onClick={startExport}
                              className="px-8"
                            >
                              Export Data
                            </Button>
                          </div>
                          
                          {showSuccess && (
                            <div className="bg-zinc-100 border border-zinc-300 rounded-xl p-4 mt-4">
                              <h3 className="text-zinc-900 font-semibold mb-1 text-sm">Export Complete!</h3>
                              <p className="text-zinc-700 text-sm">Successfully extracted {crawlData.length} items</p>
                              <p className="text-xs text-zinc-600 mt-1">Your download should start automatically</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
          
          
        </div>
      </MainContent>
      
      
      <Footer />

    </Layout>
  )
}