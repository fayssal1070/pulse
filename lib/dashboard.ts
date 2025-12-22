import { prisma } from './prisma'

// Récupérer toutes les organisations d'un utilisateur
async function getUserOrganizationIds(userId: string, activeOrgId?: string | null): Promise<string[]> {
  if (activeOrgId) {
    // Vérifier que l'utilisateur appartient à cette organisation
    const membership = await prisma.membership.findFirst({
      where: { userId, orgId: activeOrgId },
    })
    if (membership) {
      return [activeOrgId]
    }
  }
  
  // Sinon, toutes les organisations
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { orgId: true },
  })
  return memberships.map((m) => m.orgId)
}

// Total des coûts sur N jours pour l'org active (ou toutes si aucune spécifiée)
export async function getTotalCosts(userId: string, days: number, activeOrgId?: string | null): Promise<number> {
  const orgIds = await getUserOrganizationIds(userId, activeOrgId)
  if (orgIds.length === 0) return 0

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const result = await prisma.costRecord.aggregate({
    where: {
      orgId: { in: orgIds },
      date: { gte: startDate },
    },
    _sum: {
      amountEUR: true,
    },
  })

  return result._sum.amountEUR || 0
}

// Top 10 services sur 30 jours pour l'org active (ou toutes si aucune spécifiée)
export async function getTopServices(userId: string, days: number = 30, limit: number = 10, activeOrgId?: string | null) {
  const orgIds = await getUserOrganizationIds(userId, activeOrgId)
  if (orgIds.length === 0) return []

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const costs = await prisma.costRecord.findMany({
    where: {
      orgId: { in: orgIds },
      date: { gte: startDate },
    },
    select: {
      provider: true,
      service: true,
      amountEUR: true,
    },
  })

  const serviceTotals = costs.reduce((acc, cost) => {
    const key = `${cost.provider}:${cost.service}`
    acc[key] = (acc[key] || 0) + cost.amountEUR
    return acc
  }, {} as Record<string, number>)

  return Object.entries(serviceTotals)
    .map(([key, total]) => {
      const [provider, service] = key.split(':')
      return { provider, service, total }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

// Série 30 jours : total par date pour l'org active (ou toutes si aucune spécifiée)
export async function getDailySeries(userId: string, days: number = 30, activeOrgId?: string | null) {
  const orgIds = await getUserOrganizationIds(userId, activeOrgId)
  if (orgIds.length === 0) return []

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const costs = await prisma.costRecord.findMany({
    where: {
      orgId: { in: orgIds },
      date: { gte: startDate },
    },
    select: {
      date: true,
      amountEUR: true,
    },
  })

  // Grouper par date (sans l'heure)
  const dailyTotals = costs.reduce((acc, cost) => {
    const dateKey = cost.date.toISOString().split('T')[0] // YYYY-MM-DD
    acc[dateKey] = (acc[dateKey] || 0) + cost.amountEUR
    return acc
  }, {} as Record<string, number>)

  // Convertir en tableau et trier par date
  return Object.entries(dailyTotals)
    .map(([date, total]) => ({
      date: new Date(date),
      total,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

