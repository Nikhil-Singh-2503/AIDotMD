import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Download,
  ExternalLink,
  Clock,
} from 'lucide-react'

interface UpdateInfo {
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
}

interface UpdateWidgetProps {
  variant?: 'compact' | 'full'
}

export function UpdateWidget({ variant = 'compact' }: UpdateWidgetProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const { data: versionInfo } = useQuery<UpdateInfo>({
    queryKey: ['version'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/version')
        if (!res.ok) throw new Error('Failed to fetch version')
        return res.json()
      } catch {
        return { version: '1.0.0' }
      }
    },
    staleTime: 1000 * 60 * 60,
  })

  const { data: updateInfo, refetch: checkUpdates } = useQuery<UpdateCheckResult>({
    queryKey: ['update-check'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/updates/check')
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

  const handleCheckUpdates = async () => {
    setIsChecking(true)
    try {
      await checkUpdates()
      setLastChecked(new Date())
    } finally {
      setIsChecking(false)
    }
  }

  const hasUpdate = updateInfo?.update_available

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (variant === 'compact') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RefreshCw className={cn('h-4 w-4', isChecking && 'animate-spin')} />
              <span className="font-medium">Updates</span>
            </div>
            <span className="text-sm text-muted-foreground">v{versionInfo?.version || '...'}</span>
          </div>

          {hasUpdate ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Update available: {updateInfo?.latest}</span>
              </div>
              <Button size="sm" className="w-full" onClick={handleCheckUpdates} disabled={isChecking}>
                {isChecking ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Check for Updates
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">You're up to date</span>
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={handleCheckUpdates} disabled={isChecking}>
                {isChecking ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                Check Now
              </Button>
            </div>
          )}

          {lastChecked && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          System Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Current Version</p>
            <p className="text-xl font-bold">v{versionInfo?.version || '...'}</p>
            {versionInfo?.build && (
              <p className="text-xs text-muted-foreground">Build: {versionInfo.build}</p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Latest Version</p>
            <p className={cn('text-xl font-bold', hasUpdate && 'text-amber-600 dark:text-amber-400')}>
              v{updateInfo?.latest || '...'}
            </p>
            {versionInfo?.deployment && (
              <p className="text-xs text-muted-foreground">Deploy: {versionInfo.deployment}</p>
            )}
          </div>
        </div>

        {hasUpdate && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">
                {updateInfo?.is_major ? 'Major' : 'Minor'} Update Available
              </span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Version {updateInfo?.latest} is available. Update to get the latest features and fixes.
            </p>
            {updateInfo?.changelog_url && (
              <a
                href={updateInfo.changelog_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300 hover:underline mt-2"
              >
                View Changelog <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {!hasUpdate && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">You're up to date!</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Running the latest version of AIDotMD.
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
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check for Updates
            </>
          )}
        </Button>

        {versionInfo?.deployment && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium mb-1">Deployment Method</p>
            <p className="text-xs text-muted-foreground capitalize">{versionInfo.deployment}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}