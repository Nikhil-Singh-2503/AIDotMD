import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Clock,
  Server,
  Terminal,
  Copy,
  Check,
  Settings,
} from 'lucide-react'

interface VersionInfo {
  version: string
  build?: string
  deployment?: string
}

interface UpdateCheckResult {
  current: string
  latest: string
  update_available: boolean
  is_major: boolean
  last_checked: string
  changelog_url?: string
  deployment_method?: string
}

export default function UpdatesPage() {
  const [isChecking, setIsChecking] = useState(false)
  const [autoCheck, setAutoCheck] = useState(() => {
    const saved = localStorage.getItem('aidotmd_auto_check')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [includePrerelease, setIncludePrerelease] = useState(() => {
    const saved = localStorage.getItem('aidotmd_include_prerelease')
    return saved !== null ? JSON.parse(saved) : false
  })
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)
  const [deploymentOverride, setDeploymentOverride] = useState<string>(() => {
    return localStorage.getItem('aidotmd_deployment_override') || ''
  })

  const { data: versionInfo } = useQuery<VersionInfo>({
    queryKey: ['version'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/version')
        if (!res.ok) throw new Error('Failed to fetch version')
        return res.json()
      } catch {
        return { version: '1.0.0', deployment: 'source' }
      }
    },
    staleTime: 1000 * 60 * 60,
  })

  const { data: updateInfo, refetch: checkUpdates } = useQuery<UpdateCheckResult>({
    queryKey: ['update-check', includePrerelease],
    queryFn: async () => {
      try {
        const url = `/api/v1/updates/check?include_prerelease=${includePrerelease}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to check updates')
        return res.json()
      } catch {
        return {
          current: versionInfo?.version || '1.0.0',
          latest: versionInfo?.version || '1.0.0',
          update_available: false,
          is_major: false,
          last_checked: new Date().toISOString(),
        }
      }
    },
    enabled: false,
    staleTime: 0,
  })

  const handleDeploymentChange = (value: string) => {
    setDeploymentOverride(value)
    if (value) {
      localStorage.setItem('aidotmd_deployment_override', value)
    } else {
      localStorage.removeItem('aidotmd_deployment_override')
    }
  }

  const handleAutoCheckChange = (checked: boolean) => {
    setAutoCheck(checked)
    localStorage.setItem('aidotmd_auto_check', JSON.stringify(checked))
  }

  const handlePrereleaseChange = (checked: boolean) => {
    setIncludePrerelease(checked)
    localStorage.setItem('aidotmd_include_prerelease', JSON.stringify(checked))
  }

  const handleCheckUpdates = async () => {
    setIsChecking(true)
    try {
      await checkUpdates()
    } finally {
      setIsChecking(false)
    }
  }

  const copyCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd)
    setCopiedCommand(id)
    setTimeout(() => setCopiedCommand(null), 2000)
  }

  // Auto check for updates on mount if enabled
  useEffect(() => {
    if (autoCheck) {
      checkUpdates()
    }
  }, [autoCheck])

  useEffect(() => {
    if (!autoCheck) return
    
    const interval = setInterval(() => {
      checkUpdates()
    }, 1000 * 60 * 60) // Check every hour
    
    return () => clearInterval(interval)
  }, [autoCheck, checkUpdates])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const hasUpdate = updateInfo?.update_available
  const detectedDeployment = versionInfo?.deployment || 'source'
  const deployment = deploymentOverride || detectedDeployment

  const getUpdateCommands = () => {
    if (deployment === 'docker') {
      return [
        { label: 'Pull latest image', cmd: 'docker-compose pull' },
        { label: 'Restart containers', cmd: 'docker-compose up -d' },
        { label: 'View logs', cmd: 'docker-compose logs -f' },
      ]
    }
    return [
      { label: 'Pull latest changes', cmd: 'git pull origin main' },
      { label: 'Install dependencies', cmd: 'pip install -r requirements.txt' },
      { label: 'Restart application', cmd: 'pm2 restart all' },
    ]
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Updates</h1>
          <p className="text-muted-foreground">Manage system updates and check for new releases</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Current Version
            </CardTitle>
            <CardDescription>Your current AIDotMD installation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="text-2xl font-bold">v{versionInfo?.version || '...'}</p>
              </div>
              {versionInfo?.build && (
                <Badge variant="secondary">Build: {versionInfo.build}</Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <p className="text-sm text-muted-foreground">Deployment</p>
                <p className="font-medium capitalize">{deployment}</p>
              </div>
              <Badge variant="outline">{deployment === 'docker' ? 'Docker' : 'Source'}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Update Status
            </CardTitle>
            <CardDescription>Check for available updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasUpdate ? (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold text-lg">
                    {updateInfo?.is_major ? 'Major' : 'Minor'} Update Available
                  </span>
                </div>
                <p className="text-amber-700 dark:text-amber-300 mb-3">
                  Version <strong>{updateInfo?.latest}</strong> is now available. Update to get the latest features, improvements, and bug fixes.
                </p>
                {updateInfo?.changelog_url && (
                  <a
                    href={updateInfo.changelog_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    View Changelog <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold text-lg">You're up to date!</span>
                </div>
                <p className="text-green-700 dark:text-green-300 mt-1">
                  Running version {versionInfo?.version}. No updates available.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>Last checked: {formatDate(updateInfo?.last_checked)}</span>
              </div>
            </div>

            <Button className="w-full" onClick={handleCheckUpdates} disabled={isChecking}>
              {isChecking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking for updates...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check for Updates
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Update Instructions
            </CardTitle>
            <CardDescription>Commands to update your installation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Run the following commands to update your {deployment} installation:
            </p>
            {getUpdateCommands().map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <code className="flex-1 p-2 rounded bg-muted text-sm font-mono overflow-x-auto">
                  {item.cmd}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyCommand(item.cmd, item.label)}
                >
                  {copiedCommand === item.label ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Update Settings
            </CardTitle>
            <CardDescription>Configure automatic update checks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-check">Automatic Checks</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically check for updates periodically
                </p>
              </div>
              <Switch
                id="auto-check"
                checked={autoCheck}
                onCheckedChange={handleAutoCheckChange}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="prerelease">Include Pre-releases</Label>
                <p className="text-sm text-muted-foreground">
                  Show beta and RC versions
                </p>
              </div>
              <Switch
                id="prerelease"
                checked={includePrerelease}
                onCheckedChange={handlePrereleaseChange}
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="deployment-override">Deployment Method Override</Label>
                <p className="text-sm text-muted-foreground">
                  Manually override the detected deployment type
                </p>
              </div>
              <select
                id="deployment-override"
                value={deploymentOverride}
                onChange={(e) => handleDeploymentChange(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              >
                <option value="">Auto-detected: {detectedDeployment}</option>
                <option value="docker">Docker</option>
                <option value="source">Source</option>
              </select>
              {deploymentOverride && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Using override: {deploymentOverride} (will affect update commands)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}