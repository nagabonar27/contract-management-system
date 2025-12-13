"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { Playfair_Display, Inter } from 'next/font/google'
import Link from "next/link"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

// Fonts
const fontHeading = Playfair_Display({ subsets: ['latin'] })
const fontBody = Inter({ subsets: ['latin'] })

export default function LoginPage() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        let emailToSubmit = username
        if (!username.includes("@")) {
            emailToSubmit = `${username}@system.local`
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: emailToSubmit,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.push("/dashboard")
        }
    }

    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">

            {/* LEFT SIDE: FORM */}
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto grid w-[350px] gap-6">
                    <div className="grid gap-2 text-center">
                        <h1 className="text-3xl font-bold">Contract Management System</h1>
                        <p className="text-balance text-muted-foreground">
                            Enter your credential
                        </p>
                    </div>

                    {error && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email or Username</Label>
                            <Input
                                id="email"
                                type="text"
                                placeholder="m@example.com"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Password</Label>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login"}
                        </Button>
                    </form>
                </div>
            </div>

            {/* RIGHT SIDE: ISOMETRIC ANIMATION */}
            <div className="hidden bg-muted lg:block relative overflow-hidden bg-zinc-900 border-l border-zinc-800">
                <div className="absolute inset-0 flex items-center justify-center perspective-[1000px]">
                    <div className="relative transform-style-3d rotate-x-[60deg] rotate-z-[-45deg] scale-150">
                        {/* Repeat lines for the effect */}
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "whitespace-nowrap text-[4rem] font-bold text-transparent px-4 py-2 uppercase tracking-widest animate-marquee",
                                    "bg-clip-text bg-gradient-to-r from-zinc-800 via-zinc-500 to-zinc-800",
                                    i % 2 === 0 ? "ml-20" : "-ml-20"
                                )}
                                style={{
                                    animationDuration: `${15 + i % 5}s`,
                                    animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
                                    fontFamily: fontHeading.style.fontFamily
                                }}
                            >
                                Contract Management System
                            </div>
                        ))}
                    </div>
                </div>

                {/* Overlay Gradient for Fade */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-zinc-900 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-transparent to-zinc-900 pointer-events-none" />

            </div>
        </div>
    )
}