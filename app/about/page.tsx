import PublicNav from '@/components/public-nav'
import PublicFooter from '@/components/public-footer'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      
      <main className="flex-grow">
        <section className="bg-white py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                About PULSE
              </h1>
            </div>

            <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
              <p>
                PULSE was born from a simple observation: cloud costs are hard to track and even harder to control. Teams waste thousands of euros every month because they lack visibility into their spending.
              </p>
              <p>
                We built PULSE to solve this problem. Our platform gives you real-time insights into your cloud costs, helps you set budgets, and alerts you before spending gets out of hand.
              </p>
              <p>
                We believe cost management should be simple, transparent, and accessible to every team—not just those with dedicated DevOps resources.
              </p>
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/contact?action=demo"
                className="inline-block px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Request a Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

