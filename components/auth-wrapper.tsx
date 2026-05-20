'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCustodyStore } from '@/lib/custody-store'
import { loginUser } from '@/app/actions/db-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, User as UserIcon } from 'lucide-react'

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { currentUser, login } = useCustodyStore()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    )
  }

  if (!currentUser) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setIsLoading(true)

      try {
        const result = await loginUser(username, password)
        if (result.success && result.user) {
          login(result.user)
          if (result.user.role === 'supervisor') {
            router.push('/admin')
          }
        } else {
          setError(result.error || 'Error al iniciar sesión')
        }
      } catch (err) {
        setError('Ocurrió un error inesperado')
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card w-full max-w-md rounded-xl border border-border p-8 shadow-lg">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-primary/20 p-3 rounded-full mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Sistema de Custodia</h1>
            <p className="text-muted-foreground mt-2">Ingrese sus credenciales para acceder</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-input"
                  placeholder="ej. cajero"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-input"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
