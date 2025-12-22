import { prisma } from './prisma'

// Calculer le total des coûts du mois en cours pour une organisation
export async function getCurrentMonthCosts(orgId: string): Promise<number> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  startOfMonth.setHours(0, 0, 0, 0)

  const result = await prisma.costRecord.aggregate({
    where: {
      orgId,
      date: { gte: startOfMonth },
    },
    _sum: {
      amountEUR: true,
    },
  })

  return result._sum.amountEUR || 0
}

// Calculer le pourcentage du budget consommé
export function calculateBudgetPercentage(
  currentCosts: number,
  budget: number | null
): { percentage: number; status: 'OK' | 'WARNING' | 'EXCEEDED' } {
  if (!budget || budget === 0) {
    return { percentage: 0, status: 'OK' }
  }

  const percentage = (currentCosts / budget) * 100

  if (percentage >= 100) {
    return { percentage, status: 'EXCEEDED' }
  } else if (percentage >= 80) {
    return { percentage, status: 'WARNING' }
  } else {
    return { percentage, status: 'OK' }
  }
}

