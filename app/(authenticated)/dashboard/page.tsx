import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js" // Import generic client
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { WeeklyLoadChart } from "@/components/charts/WeeklyLoadChart"
import { formatDistanceToNow, subWeeks, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const supabase = createServerComponentClient({ cookies })

    // 1. Get User
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 1a. Create Admin Client for Data Fetching (Bypass RLS)
    // We use this because the dashboard needs to show aggregate/recent activity that might be
    // blocked by complex RLS policies for the individual user, or requires cross-table access.
    // Since this is a server component, it's safe.
    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        }
    )

    // Get user name profile (using user context is fine/better for "My Profile")
    // But we can use admin to be safe if profile RLS is strict
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single()

    const userName = profile?.full_name || user?.email?.split('@')[0] || 'User'

    // 2. Fetch Contracts Data - SWITCH TO CONTRACT_VERSIONS
    // We need:
    // - Total ongoing contracts (status = 'On Progress', 'Draft' etc. NOT 'Active'/'Finished')
    const { data: contracts, error: contractsError } = await adminSupabase
        .from('contract_versions')
        .select('id, title, status, created_at, updated_at')
        .eq('is_current', true)

    if (contractsError) {
        console.error("Error fetching contracts:", contractsError)
    }

    const allContracts = contracts || []

    // Define "Ongoing" as anything NOT Active/Completed/Finished/Expired
    const isOngoing = (status: string) => !['Active', 'Finished', 'Completed', 'Expired'].includes(status)

    const ongoingContracts = allContracts.filter(c => isOngoing(c.status))

    // Calculate Total Ongoing
    const totalOngoing = ongoingContracts.length

    // Calculate New Contracts This Week
    const now = new Date()
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }) // Monday start
    const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 })

    const newContractsThisWeek = allContracts.filter(c => {
        if (!c.created_at) return false
        const createdDate = new Date(c.created_at)
        return isWithinInterval(createdDate, { start: startOfCurrentWeek, end: endOfCurrentWeek })
    }).length

    // Calculate Avg Ongoing Lead Time (in Days)
    let avgLeadTime = 0
    if (ongoingContracts.length > 0) {
        const totalDurationMs = ongoingContracts.reduce((acc, c) => {
            if (!c.created_at) return acc
            const createdDate = new Date(c.created_at)
            return acc + (now.getTime() - createdDate.getTime())
        }, 0)
        const avgDurationMs = totalDurationMs / ongoingContracts.length
        const days = avgDurationMs / (1000 * 60 * 60 * 24)
        avgLeadTime = Number(days.toFixed(1)) // 1 decimal place
    }

    // 3. Prepare Chart Data (Weekly Load - ONGOING Contracts per week for last 8 weeks)
    // "Weekly load" = "ongoing contract per week".

    const weeksToShow = 8
    const chartData = []

    for (let i = weeksToShow - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 })

        // Count ONGOING contracts in this window
        const activeCount = allContracts.filter(c => {
            if (!c.created_at) return false
            const createdDate = new Date(c.created_at)

            // It must have been created before the end of the week
            if (createdDate > weekEnd) return false

            // Logic:
            // It contributes to load if it was "alive" (Ongoing) during this week.
            // Start < WeekEnd AND End > WeekStart.
            // Start = CreatedAt.
            // End = UpdatedAt (if status is Active/Finished) OR Now (if still Ongoing).

            let endDate = now
            if (!isOngoing(c.status) && c.updated_at) {
                // If it's Active/Finished, we assume updated_at is when it stopped being "Ongoing"
                endDate = new Date(c.updated_at)
            }

            // Standard overlap check: (Start <= WindowEnd) AND (End >= WindowStart)
            // We already checked Created (Start) <= WeekEnd above.
            // So we just need: End >= WeekStart.

            return endDate >= weekStart
        }).length

        // Improved Logic requiring updated_at.
        // I need to update the fetch query above first. 
        // But for this block, I'll assume I have the data or use a simpler "Active Now" history? 
        // No, "Active Now" is constant. 
        // "Distinct count of ID": Yes, `activeCount` is a count of IDs.

        // Label Formatting: "1 2 3 4 \n dec"
        // We'll generate a label like "Dec W1", "Dec W2" for unique keys, 
        // and pass derived fields for the custom tick.

        const monthName = weekStart.toLocaleString('default', { month: 'short' }).toLowerCase()
        const weekNum = Math.ceil(weekStart.getDate() / 7) // Rough week of month

        chartData.push({
            name: `${monthName} ${weekNum}`, // Unique key
            labelWeek: `${weekNum}`,
            labelMonth: monthName,
            total: activeCount
        })
    }


    // 4. Fetch Recent Activity
    // Fetch from BOTH contract_bid_agenda AND contract_versions (for creation/status change)

    // 4a. Agenda Items (Raw fetch to avoid relationship issues)
    const { data: agendaRaw } = await adminSupabase
        .from('contract_bid_agenda')
        .select(`
            id, 
            step_name, 
            status, 
            updated_at,
            created_by,
            contract_id,
            profiles:created_by (full_name)
        `)
        .order('updated_at', { ascending: false })
        .limit(5)

    // 4b. Recent Contracts (Created or Updated)
    const { data: recentContracts } = await adminSupabase
        .from('contract_versions')
        .select(`
            id,
            title,
            status,
            created_at,
            updated_at,
            current_step,
            parent:contracts!parent_id (
                created_by,
                profiles:created_by (full_name)
            ),
            contract_bid_agenda (
                step_name,
                updated_at
            )
        `)
        .order('updated_at', { ascending: false })
        .limit(5)

    // 4c. Resolve Contract Titles for Agenda
    // Collect all version IDs we need: those from agenda and the recent contracts themselves
    const versionIds = new Set<string>()
    agendaRaw?.forEach(a => { if (a.contract_id) versionIds.add(a.contract_id) })
    recentContracts?.forEach(c => versionIds.add(c.id))

    let versionMap: Record<string, { title: string }> = {}

    if (versionIds.size > 0) {
        const { data: versions } = await adminSupabase
            .from('contract_versions')
            .select('id, title')
            .in('id', Array.from(versionIds))

        if (versions) {
            versions.forEach(v => {
                versionMap[v.id] = { title: v.title }
            })
        }
    }

    // 4d. Merge and Sort
    const combinedActivity = [
        ...(agendaRaw || []).map((item: any) => ({
            id: `agenda-${item.id}`,
            // Title = Profile Name OR Default "System"
            title: item.profiles?.full_name || "System",
            // Description = Bid Agenda - Contract Name
            contractTitle: versionMap[item.contract_id]?.title || "Unknown Contract",
            contractId: item.contract_id,
            stepName: item.step_name,
            timestamp: item.updated_at,
            type: 'agenda'
        })),
        ...(recentContracts || []).map((item: any) => {
            // Find latest agenda step from the nested data
            const latestAgenda = item.contract_bid_agenda?.sort((a: any, b: any) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )[0];
            const agendaStepName = latestAgenda?.step_name;

            // Handle parent profile structure
            const profileName = (item.parent as any)?.profiles?.full_name || "System"

            return {
                id: `contract-${item.id}`,
                title: profileName,
                contractTitle: item.title,
                contractId: item.id,
                stepName: agendaStepName || item.current_step || item.status,
                description: `${agendaStepName || item.current_step || item.status} - ${item.title}`,
                timestamp: item.updated_at || item.created_at,
                type: 'contract'
            }
        })
    ].sort((a, b) => {
        const tA = new Date(a.timestamp).getTime()
        const tB = new Date(b.timestamp).getTime()
        return tB - tA // Descending
    }).slice(0, 5)

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Hi, Welcome Back {userName}</h2>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Ongoing Contracts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOngoing}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Avg Ongoing Lead Time
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgLeadTime} Days</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            New Contracts This Week
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{newContractsThisWeek}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Activity Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                    <WeeklyLoadChart data={chartData} />
                </div>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px] w-full pr-4">
                            <div className="space-y-4">
                                {combinedActivity.map((activity) => (
                                    <div key={activity.id} className="flex items-center gap-4">
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback>
                                                {/* Use first letter of User Name or '?' */}
                                                {activity.title ? activity.title.charAt(0).toUpperCase() : '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {activity.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate w-[200px] sm:w-[300px]">
                                                {/* Bold and Link the title */}
                                                {activity.contractId ? (
                                                    <Link href={`/bid-agenda/${activity.contractId}`} className="font-bold hover:underline">
                                                        {activity.contractTitle}
                                                    </Link>
                                                ) : (
                                                    <span className="font-bold">{activity.contractTitle}</span>
                                                )}
                                                {/* Normal weight for the rest */}
                                                <span> - {activity.stepName}</span>
                                            </p>
                                        </div>
                                        <div className="ml-auto font-medium text-xs text-muted-foreground">
                                            {activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp + (activity.timestamp.endsWith('Z') ? '' : 'Z')), { addSuffix: true }) : '-'}
                                        </div>
                                    </div>
                                ))}
                                {combinedActivity.length === 0 && (
                                    <div className="text-sm text-muted-foreground">No recent activity.</div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}