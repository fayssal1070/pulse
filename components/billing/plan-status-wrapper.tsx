'use client'

import { useEffect, useState } from 'react'
import { getPlanInfo, PlanInfo } from '@/lib/billing/plan-client'
import { UpgradeRequired } from './upgrade-required'

interface PlanStatusWrapperProps {
  children: React.ReactNode
  requiredPlan?: 'STARTER' | 'PRO' | 'BUSINESS'
  feature?: string
  message?: string
}

export function PlanStatusWrapper({
  children,
  requiredPlan,
  feature,
  message,
}: PlanStatusWrapperProps) {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlanInfo().then((info) => {
      setPlanInfo(info)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div className="text-sm text-gray-600">Loading...</div>
  }

  if (!planInfo) {
    return <div className="text-sm text-red-600">Failed to load plan information</div>
  }

  // Check if upgrade is required
  const planHierarchy = { STARTER: 1, PRO: 2, BUSINESS: 3 }
  const currentPlanLevel = planHierarchy[planInfo.plan as keyof typeof planHierarchy] || 1
  const requiredPlanLevel = requiredPlan ? planHierarchy[requiredPlan] : 0

  if (requiredPlan && currentPlanLevel < requiredPlanLevel) {
    return (
      <UpgradeRequired
        message={message || `This feature requires the ${requiredPlan} plan`}
        feature={feature}
        plan={planInfo.plan}
        requiredPlan={requiredPlan}
      />
    )
  }

  return <>{children}</>
}

