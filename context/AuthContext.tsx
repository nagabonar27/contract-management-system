'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User, Session } from '@supabase/supabase-js'

// 1. Define the shape of our context data
interface AuthContextType {
    user: User | null
    profile: any | null
    session: Session | null
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Create the client here, inside the component, to ensure it uses the browser context
    const supabase = createClientComponentClient()

    useEffect(() => {
        // A. Check active session on load
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setIsLoading(false)
            }
        })

        // B. Listen for changes (login, logout, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)

            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setProfile(null)
                setIsLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    // --- FIXED FUNCTION START ---
    const fetchProfile = async (userId: string) => {
        try {
            console.log("DEBUG: Fetching Profile for ID:", userId) // <--- Check ID matches

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle()

            if (error) {
                console.error('Supabase Error:', error) // DEBUG 2
            }

            setProfile(data)
            console.log("DEBUG: Fetched Profile:", data) // <--- Added Log
        } catch (err) {
            console.error('Unexpected error fetching profile:', err)
        } finally {
            setIsLoading(false)
        }
    }
    // --- FIXED FUNCTION END ---

    // C. The Value passed to the rest of the app
    const value = {
        user,
        session,
        profile,
        isLoading
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

// D. The Hook used in components
export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}