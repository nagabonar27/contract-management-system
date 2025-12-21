// app/login/page.tsx
import Image from "next/image"
import cmsImage from "@/components/assets/cms.png"
import maaLogo from "@/components/assets/maa.png"
import { GalleryVerticalEnd } from "lucide-react"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            {/* BACKGROUND IMAGE */}
            <div className="fixed inset-0 -z-10">
                <Image
                    src={cmsImage}
                    alt="Background"
                    fill
                    className="object-cover brightness-[0.4]" // Added brightness reduction for form readability
                    priority
                />
            </div>

            <div className="flex w-full max-w-sm flex-col gap-6">
                <a href="#" className="flex items-center gap-2 self-center font-medium text-white">
                    <div className="flex size-6 items-center justify-center rounded-md">
                        <Image src={maaLogo} alt="Logo" className="size-4" />
                    </div>
                    Contract Management System
                </a>

                {/* Card wrapper for the form to make it pop against the image */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-8">
                    <LoginForm />
                </div>
            </div>
        </div>
    )
}