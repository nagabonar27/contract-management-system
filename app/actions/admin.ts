"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

// Use Service Role Key for administrative bypass
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function resetUserPassword(userId: string, newPassword: string) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
    )

    if (error) throw new Error(error.message)

    revalidatePath("/admin/users")
    return { success: true }
}

// Helper to validate email format
function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createNewUser(formData: {
    email?: string,
    password: string,
    full_name: string,
    position: string
}) {
    console.log("[Admin Action] Creating new user:", { ...formData, password: "***" });

    // 0. Safety Check
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("[Admin Action] Missing SUPABASE_SERVICE_ROLE_KEY");
        throw new Error("Server configuration error: Missing Service Role Key");
    }

    // 1. Generate system email if email is empty or missing
    let finalEmail = formData.email;

    if (!finalEmail || finalEmail.trim() === "") {
        // Formats "John Doe" -> "john_doe@system.local"
        const username = formData.full_name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]/g, '_'); // Replace non-alphanumeric with underscore
        finalEmail = `${username}@system.local`;
    } else {
        if (!isValidEmail(finalEmail)) {
            throw new Error("Invalid email format provided.");
        }
    }

    // 2. Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: finalEmail,
        password: formData.password,
        email_confirm: true, // Auto-confirm so they can log in immediately
    })

    if (authError) {
        console.error("[Admin Action] Auth Create Error:", authError);
        throw new Error(`Auth Error: ${authError.message}`);
    }

    if (!authUser?.user) {
        throw new Error("User created but no user object returned.");
    }

    // 3. Insert into your public.profiles table
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([
            {
                id: authUser.user.id,
                email: finalEmail,
                full_name: formData.full_name,
                position: formData.position
            }
        ])

    if (profileError) {
        console.error("[Admin Action] Profile Insert Error:", profileError);
        // Clean up Auth user if profile creation fails to prevent orphaned accounts
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Profile Error: ${profileError.message}`);
    }

    revalidatePath("/admin/users")
    return { success: true }
}

export async function updateUserInfo(userId: string, formData: {
    full_name: string,
    position: string
}) {
    // 0. Safety Check
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Server configuration error: Missing Service Role Key");
    }

    // 1. Update public.profiles table
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            full_name: formData.full_name,
            position: formData.position
        })
        .eq('id', userId)

    if (profileError) {
        console.error("[Admin Action] Profile Update Error:", profileError);
        throw new Error(`Profile Update Error: ${profileError.message}`);
    }

    // 2. Revalidate paths
    revalidatePath("/admin/users")
    revalidatePath("/dashboard/admin/users")
    return { success: true }
}