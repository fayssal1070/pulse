import PublicNav from '@/components/public-nav'
import PublicFooter from '@/components/public-footer'

export default function SecurityPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      
      <main className="flex-grow">
        <section className="bg-white py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Security & Compliance
              </h1>
              <p className="text-xl text-gray-600">
                Your data security is our top priority. We implement industry best practices to protect your information.
              </p>
            </div>

            <div className="space-y-12">
              {/* Data Protection */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Protection</h2>
                <div className="space-y-4 text-gray-700">
                  <p>
                    All data transmitted between your browser and our servers is encrypted using TLS 1.3. Your cost data is stored securely in our database with encryption at rest.
                  </p>
                  <p>
                    We never store your cloud provider credentials. You maintain full control over your data access and can export or delete your information at any time.
                  </p>
                </div>
              </div>

              {/* Authentication */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication & Access</h2>
                <div className="space-y-4 text-gray-700">
                  <p>
                    User passwords are hashed using industry-standard bcrypt with a secure salt. We support secure session management with HTTP-only cookies.
                  </p>
                  <p>
                    Organization owners can invite team members and control access levels. All access is logged and auditable.
                  </p>
                </div>
              </div>

              {/* Infrastructure */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Infrastructure Security</h2>
                <div className="space-y-4 text-gray-700">
                  <p>
                    Our infrastructure runs on trusted cloud providers with regular security updates and monitoring. We maintain strict access controls and follow the principle of least privilege.
                  </p>
                  <p>
                    Database backups are performed regularly and stored securely. We have disaster recovery procedures in place to ensure service continuity.
                  </p>
                </div>
              </div>

              {/* Privacy */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy & Compliance</h2>
                <div className="space-y-4 text-gray-700">
                  <p>
                    We are committed to protecting your privacy. We only collect the data necessary to provide our service and do not sell your information to third parties.
                  </p>
                  <p>
                    Our service is designed to comply with GDPR requirements. You have the right to access, modify, or delete your personal data at any time.
                  </p>
                </div>
              </div>

              {/* Reporting */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Security Reporting</h2>
                <div className="space-y-4 text-gray-700">
                  <p>
                    If you discover a security vulnerability, please report it to us immediately. We take security issues seriously and will respond promptly.
                  </p>
                  <p>
                    Contact us at <a href="mailto:security@pulse.example.com" className="text-blue-600 hover:text-blue-700">security@pulse.example.com</a> for security-related inquiries.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-16 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Questions about security?</h3>
              <p className="text-gray-700 mb-4">
                Our team is here to help. Contact us to discuss your specific security requirements.
              </p>
              <a
                href="/contact"
                className="inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Contact Us
              </a>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

