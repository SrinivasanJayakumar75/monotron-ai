import { AuthGuard } from "@/modules/auth/ui/components/auth-guard"
import { OrganizationGuard  } from "@/modules/auth/ui/components/organization-guard"
import {SidebarProvider} from "@workspace/ui/components/sidebar"
import { cookies } from "next/headers";
import { DashboardSidebar } from "../components/dashboard-sidebar";
import { Provider } from "jotai";

export const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
    const cookieStore = await cookies()
    const sidebarState = cookieStore.get("sidebar_state")?.value
    const defaultOpen = sidebarState !== "false"

    return (
        <AuthGuard>
            <OrganizationGuard>
                <Provider>
                <SidebarProvider defaultOpen={defaultOpen} className="dashboard-scope">
                    <DashboardSidebar />
                    <main className="flex flex-1 flex-col bg-background text-foreground">
                        {children}
                    </main>
                </SidebarProvider>
                </Provider>
            </OrganizationGuard>
        </AuthGuard>
    )
}