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

export async function createNewUser(formData: {
    email?: string, // Marked as optional
    password: string,
    full_name: string,
    position: string
}) {
    // 1. Generate system email if email is empty or missing
    let finalEmail = formData.email;

    if (!finalEmail || finalEmail.trim() === "") {
        // Formats "John Doe" -> "john_doe@system.local"
        const username = formData.full_name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '_');
        finalEmail = `${username}@system.local`;
    }

    // 2. Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: finalEmail,
        password: formData.password,
        email_confirm: true, // Auto-confirm so they can log in immediately
        user_metadata: { full_name: formData.full_name }
    })

    if (authError) throw new Error(authError.message)

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
        // Clean up Auth user if profile creation fails to prevent orphaned accounts
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        throw new Error(profileError.message);
    }

    revalidatePath("/admin/users")
    return { success: true }
}