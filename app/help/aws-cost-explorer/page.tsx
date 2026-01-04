import PublicNav from '@/components/public-nav'
import PublicFooter from '@/components/public-footer'
import Link from 'next/link'

export default function AWSCostExplorerHelpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <main className="flex-grow">
        <section className="bg-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              AWS Cost Explorer Integration
            </h1>

            <div className="prose max-w-none">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
                <p className="text-blue-700">
                  <strong>Important:</strong> AWS Cost Explorer updates cost data at least every 24
                  hours. PULSE syncs once daily by default. Manual syncs are rate-limited to once
                  every 6 hours to avoid unnecessary API calls.
                </p>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
                How It Works
              </h2>
              <p className="text-gray-700 mb-4">
                PULSE connects to your AWS account using <strong>AssumeRole</strong> with an{' '}
                <strong>External ID</strong> for secure, credential-free access. This means:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                <li>No AWS access keys are stored in PULSE</li>
                <li>Only read-only access to Cost Explorer API</li>
                <li>Automatic daily sync of cost data</li>
                <li>Manual sync available (rate-limited)</li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
                Data Update Frequency
              </h2>
              <p className="text-gray-700 mb-4">
                AWS Cost Explorer updates cost data <strong>at least every 24 hours</strong>. This
                means:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                <li>
                  <strong>First-time setup:</strong> After enabling Cost Explorer, wait ~24 hours
                  for data to become available
                </li>
                <li>
                  <strong>Daily updates:</strong> Cost data is refreshed by AWS every 24 hours
                </li>
                <li>
                  <strong>PULSE sync:</strong> Syncs once daily (default) to match AWS update
                  frequency
                </li>
                <li>
                  <strong>Manual sync:</strong> Available but rate-limited to once every 6 hours
                  (syncing more frequently won't show new data)
                </li>
              </ul>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
                Enabling Cost Explorer
              </h2>
              <p className="text-gray-700 mb-4">
                If you see an error "Cost Explorer not enabled", follow these steps:
              </p>
              <ol className="list-decimal list-inside space-y-3 text-gray-700 mb-6">
                <li>
                  Go to{' '}
                  <a
                    href="https://console.aws.amazon.com/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    AWS Billing & Cost Management Console
                  </a>
                </li>
                <li>Click "Cost Explorer" in the left navigation</li>
                <li>
                  If you see "Launch Cost Explorer", <strong>click it</strong> (first time only)
                </li>
                <li>
                  <strong>Wait ~24 hours</strong> for AWS to process and make cost data available
                </li>
                <li>Then try connecting in PULSE again</li>
              </ol>
              <p className="text-sm text-gray-500 italic">
                📸 Screenshot Placeholder: AWS Billing Console → Cost Explorer → Launch Cost
                Explorer button
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
                Connection Methods
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">
                Method 1: CloudFormation (Recommended)
              </h3>
              <p className="text-gray-700 mb-4">
                The fastest way to connect. PULSE generates a CloudFormation template that creates
                the IAM Role automatically.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
                <li>Download the CloudFormation template from PULSE wizard</li>
                <li>Deploy it in AWS CloudFormation Console</li>
                <li>Copy the RoleArn from stack outputs</li>
                <li>Paste in PULSE and test connection</li>
              </ol>
              <p className="text-sm text-gray-500">
                <strong>Time:</strong> ~2 minutes | <strong>Difficulty:</strong> Easy
              </p>

              <h3 className="text-xl font-medium text-gray-900 mt-6 mb-3">
                Method 2: Manual IAM Setup
              </h3>
              <p className="text-gray-700 mb-4">
                For advanced users who prefer manual IAM role creation.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
                <li>Create IAM Role with Trust Policy (from PULSE wizard)</li>
                <li>Attach Permissions Policy (from PULSE wizard)</li>
                <li>Copy RoleArn</li>
                <li>Paste in PULSE and test connection</li>
              </ol>
              <p className="text-sm text-gray-500">
                <strong>Time:</strong> ~5 minutes | <strong>Difficulty:</strong> Medium
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
                Security
              </h2>
              <p className="text-gray-700 mb-4">
                PULSE uses industry-standard security practices:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                <li>
                  <strong>No access keys stored:</strong> Only Role ARN and External ID (no
                  credentials)
                </li>
                <li>
                  <strong>AssumeRole:</strong> Temporary credentials obtained via STS (1 hour TTL)
                </li>
                <li>
                  <strong>External ID:</strong> Unique per connection, prevents unauthorized access
                </li>
                <li>
                  <strong>Read-only permissions:</strong> Only Cost Explorer read access, no write
                  or delete
                </li>
                <li>
                  <strong>Principal restriction:</strong> Only PULSE's AWS account can assume the
                  role
                </li>
              </ul>

              <div className="mt-12 text-center">
                <Link
                  href="/register"
                  className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                >
                  Get Started with PULSE
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}





