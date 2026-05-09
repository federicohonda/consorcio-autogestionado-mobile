import { useState, useEffect, useCallback } from 'react'
import { getMembersWithBalance } from '../services/group'

/**
 * useDelinquency - Hook para detectar y gestionar socios en mora
 * 
 * Retorna:
 * - delinquent: array de socios con balance negativo (en mora)
 * - loading: boolean
 * - error: string de error si existe
 * - refresh: función para recargar datos
 */
export function useDelinquency(groupId) {
  const [delinquent, setDelinquent] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!groupId) return
    
    try {
      setError('')
      setLoading(true)
      const members = await getMembersWithBalance(groupId)
      
      // Filtrar solo los que tienen balance negativo (están en mora)
      const delinquentMembers = members.filter(
        member => parseFloat(member.net_balance) < -0.009
      )
      
      // Ordenar por urgencia (mayor deuda primero)
      delinquentMembers.sort(
        (a, b) => parseFloat(b.net_balance) - parseFloat(a.net_balance)
      )
      
      setDelinquent(delinquentMembers)
    } catch (err) {
      console.error('Error loading delinquent members:', err)
      setError(err.message || 'Error al cargar socios en mora')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    delinquent,
    loading,
    error,
    refresh,
  }
}
