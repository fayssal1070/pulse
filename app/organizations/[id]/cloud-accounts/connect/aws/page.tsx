import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import AppShell from '@/components/app-shell'
import { isAdmin } from '@/lib/admin-helpers'
import ConnectAWSContent from './connect-aws-content'

export default async function ConnectAWSPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireAuth()
  const { id } = await params

  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)
  const isAdminUser = await isAdmin()

  const hasActiveAWS = await prisma.cloudAccount.count({
    where: {
      orgId: id,
      provider: 'AWS',
      status: 'active',
    },
  }) > 0

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg?.id || null}
      hasActiveAWS={hasActiveAWS}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <ConnectAWSContent />
    </AppShell>
  )
}

// Old client component code moved to connect-aws-content.tsx
  const router = useRouter()
  const params = useParams()
  const organizationId = params.id as string

  const [externalId, setExternalId] = useState<string>('')
  const [roleArn, setRoleArn] = useState('')
  const [accountName, setAccountName] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Generate External ID on mount
  useEffect(() => {
    // Generate UUID v4
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    }
    setExternalId(generateUUID())
  }, [])

  // Get PULSE Principal ARN (for Trust Policy Principal)
  const [pulsePrincipalArn, setPulsePrincipalArn] = useState<string>('arn:aws:iam::298199649603:root')

  useEffect(() => {
    // Fetch PULSE AWS Principal ARN from API
    fetch('/api/aws/pulse-account-id')
      .then((res) => res.json())
      .then((data) => {
        if (data.principalArn) {
          setPulsePrincipalArn(data.principalArn)
        }
      })
      .catch(() => {
        // Use default if API fails
      })
  }, [])

  const trustPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          AWS: pulsePrincipalArn,
        },
        Action: 'sts:AssumeRole',
        Condition: {
          StringEquals: {
            'sts:ExternalId': externalId,
          },
        },
      },
    ],
  }

  const permissionsPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['ce:GetCostAndUsage', 'ce:GetDimensionValues'],
        Resource: '*',
      },
    ],
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Show temporary success message
      const button = document.getElementById(`copy-${type}`)
      if (button) {
        const originalText = button.textContent
        button.textContent = '✓ Copied!'
        setTimeout(() => {
          if (button) button.textContent = originalText
        }, 2000)
      }
    } catch (err) {
      alert('Failed to copy to clipboard')
    }
  }

  const handleTestConnection = async () => {
    if (!roleArn.trim() || !externalId) {
      setError('Role ARN is required')
      return
    }

    setTesting(true)
    setError('')
    setTestResult(null)

    try {
      const res = await fetch('/api/cloud-accounts/test-aws-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleArn: roleArn.trim(),
          externalId,
          organizationId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setTestResult({
          success: false,
          message: data.error || 'Connection test failed',
        })
      } else {
        setTestResult({
          success: true,
          message: data.message || 'Connection successful!',
        })
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'An error occurred while testing the connection',
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!testResult?.success) {
      setError('Please test the connection first')
      return
    }

    if (!roleArn.trim() || !accountName.trim()) {
      setError('Role ARN and Account Name are required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/cloud-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'AWS',
          accountName: accountName.trim(),
          connectionType: 'COST_EXPLORER',
          roleArn: roleArn.trim(),
          externalId,
          organizationId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'LIMIT_REACHED') {
          setError(`${data.error} Please upgrade your plan to add more cloud accounts.`)
        } else {
          setError(data.error || 'Failed to save connection')
        }
        return
      }

      // Redirect to cloud accounts page
      router.push(`/organizations/${organizationId}`)
      router.refresh()
    } catch (err) {
      setError('An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
                PULSE
              </Link>
              <span className="text-gray-400">/</span>
              <Link
                href={`/organizations/${organizationId}`}
                className="text-gray-700 hover:text-gray-900"
              >
                Organization
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-700">Connect AWS</span>
            </div>
            <Link
              href={`/organizations/${organizationId}`}
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Cancel
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect AWS Account</h1>
          <p className="text-gray-600">
            Connect your AWS account to automatically sync cost data daily. This process takes about
            5 minutes.
          </p>
        </div>

        {/* Step 1: Generate External ID */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
              1
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Generate External ID</h2>
          </div>
          <p className="text-gray-600 mb-4">
            We've generated a unique External ID for secure authentication. You'll need this in the
            next step.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono text-gray-800 break-all">{externalId}</code>
              <button
                onClick={() => copyToClipboard(externalId, 'external-id')}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Create IAM Role in AWS */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                2
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Create IAM Role in AWS</h2>
            </div>
            <button
              onClick={() => {
                const template = generateCloudFormationTemplate(externalId, pulsePrincipalArn)
                const blob = new Blob([template], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'pulse-cost-explorer-role.json'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
            >
              📥 Download CloudFormation Template
            </button>
          </div>

          {/* CloudFormation Option */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🚀 Quick Deploy (Recommended): Use CloudFormation
            </h3>
            <p className="text-gray-700 mb-4">
              Deploy the IAM Role automatically with one click using AWS CloudFormation. This is the
              fastest and most reliable method.
            </p>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Step 1: Download Template</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Click the button above to download the CloudFormation template (already configured
                  with your External ID).
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Step 2: Deploy in AWS</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>
                    Go to{' '}
                    <a
                      href="https://console.aws.amazon.com/cloudformation"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      AWS CloudFormation Console
                    </a>
                  </li>
                  <li>Click "Create stack" → "With new resources (standard)"</li>
                  <li>Select "Upload a template file"</li>
                  <li>Upload the downloaded JSON file</li>
                  <li>Click "Next"</li>
                  <li>Enter a stack name (e.g., "PULSE-CostExplorer-Setup")</li>
                  <li>Click "Next" → "Next" → "Create stack"</li>
                  <li>
                    <strong>Wait for stack creation to complete</strong> (usually 10-30 seconds)
                  </li>
                  <li>
                    In the "Outputs" tab, <strong>copy the RoleArn</strong> value
                  </li>
                </ol>
                <p className="text-sm text-gray-500 italic mt-2">
                  📸 Screenshot Placeholder: CloudFormation stack created with RoleArn in Outputs
                  tab
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Alternative: Manual Setup (Advanced)
            </h3>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                2.1 Go to AWS IAM Console
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
                <li>
                  Open{' '}
                  <a
                    href="https://console.aws.amazon.com/iam"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    AWS IAM Console
                  </a>
                </li>
                <li>Click "Roles" in the left navigation</li>
                <li>Click "Create role" button</li>
              </ol>
              <p className="text-sm text-gray-500 italic">
                📸 Screenshot Placeholder: AWS IAM Console → Roles → Create role
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                2.2 Configure Trust Policy
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
                <li>Select "Custom trust policy"</li>
                <li>Click "Edit" to open the policy editor</li>
                <li>Delete the default policy</li>
                <li>Copy the Trust Policy JSON below and paste it into the editor</li>
                <li>
                  <strong>Important:</strong> The Trust Policy is pre-configured with the correct PULSE AWS account. Do not modify the Principal ARN.
                </li>
                <li>Click "Next"</li>
              </ol>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Trust Policy JSON</span>
                  <button
                    id="copy-trust-policy"
                    onClick={() => copyToClipboard(JSON.stringify(trustPolicy, null, 2), 'trust-policy')}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="text-xs font-mono text-gray-800 overflow-x-auto">
                  {JSON.stringify(trustPolicy, null, 2)}
                </pre>
              </div>
              <p className="text-sm text-gray-500 italic">
                📸 Screenshot Placeholder: AWS IAM Trust Policy editor with pasted JSON
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                2.3 Add Permissions Policy
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
                <li>On the "Add permissions" page, click "Create policy"</li>
                <li>Click the "JSON" tab</li>
                <li>Copy the Permissions Policy JSON below and paste it into the editor</li>
                <li>Click "Next" → Enter a name (e.g., "PULSE-CostExplorer-ReadOnly")</li>
                <li>Click "Create policy"</li>
                <li>Go back to the role creation, search for your policy, select it, and click "Next"</li>
              </ol>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Permissions Policy JSON</span>
                  <button
                    id="copy-permissions-policy"
                    onClick={() => copyToClipboard(JSON.stringify(permissionsPolicy, null, 2), 'permissions-policy')}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="text-xs font-mono text-gray-800 overflow-x-auto">
                  {JSON.stringify(permissionsPolicy, null, 2)}
                </pre>
              </div>
              <p className="text-sm text-gray-500 italic">
                📸 Screenshot Placeholder: AWS IAM Policy JSON editor with pasted permissions
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">2.4 Complete Role Creation</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
                <li>Enter a role name (e.g., "PULSE-CostExplorer-Role")</li>
                <li>Add a description (optional): "Allows PULSE to read cost data via Cost Explorer API"</li>
                <li>Click "Create role"</li>
                <li>
                  <strong>Copy the Role ARN</strong> (e.g.,{' '}
                  <code className="bg-gray-100 px-1 rounded">
                    arn:aws:iam::123456789012:role/PULSE-CostExplorer-Role
                  </code>
                  )
                </li>
              </ol>
              <p className="text-sm text-gray-500 italic">
                📸 Screenshot Placeholder: AWS IAM Role created with Role ARN highlighted
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Connect in PULSE */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
              3
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Connect in PULSE</h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {testResult && (
            <div
              className={`mb-4 px-4 py-3 rounded ${
                testResult.success
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {testResult.success ? '✓' : '✗'} {testResult.message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-2">
                Account Name <span className="text-red-500">*</span>
              </label>
              <input
                id="accountName"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g., Production AWS Account"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                A friendly name to identify this AWS account in PULSE
              </p>
            </div>

            <div>
              <label htmlFor="roleArn" className="block text-sm font-medium text-gray-700 mb-2">
                Role ARN <span className="text-red-500">*</span>
              </label>
              <input
                id="roleArn"
                type="text"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
                placeholder="arn:aws:iam::123456789012:role/PULSE-CostExplorer-Role"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Paste the Role ARN you copied from AWS IAM Console
              </p>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                onClick={handleTestConnection}
                disabled={testing || !roleArn.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !testResult?.success || !accountName.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Connection'}
              </button>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Security Note</h3>
          <p className="text-gray-700 mb-2">
            The Trust Policy uses a specific PULSE AWS account ID for maximum security. This ensures only PULSE can assume the role, even if the External ID is compromised.
          </p>
          <p className="text-gray-700 text-sm">
            If you need assistance, contact PULSE support.
          </p>
        </div>
      </main>
    </div>
  )
}

