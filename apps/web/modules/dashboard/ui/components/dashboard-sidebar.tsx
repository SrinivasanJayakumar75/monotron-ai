"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {CreditCardIcon,
    ActivityIcon,
    AnchorIcon,
    BrushIcon,
    MicVocalIcon,
    ChartBarIcon,
    GlobeIcon,
    WorkflowIcon,
    MailsIcon,
    ChevronRightIcon,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";

const customerSupportItems = [
    {
        title: "Conversations",
        url: "/conversations",
        icon: ChartBarIcon,
    },
    {
        title: "Bulk email",
        url: "/bulk-email",
        icon: MailsIcon,
    },
        {
        title: "Knowledge Base",
        url: "/files",
        icon: AnchorIcon,
    },
    {
        title: "Website analytics",
        url: "/website-analytics",
        icon: GlobeIcon,
    },

];

const crmModuleItems = [
    { title: "Leads", url: "/crm/leads" },
    { title: "Deals", url: "/crm/deals" },
    { title: "Accounts", url: "/crm/accounts" },
    { title: "Contacts", url: "/crm/contacts" },
    { title: "Executive dashboard", url: "/dashboard" },
    { title: "Tasks", url: "/crm/tasks" },
    { title: "Sales", url: "/crm/sales" },
    { title: "Events", url: "/crm/events" },
    { title: "Emails", url: "/crm/emails" },
    { title: "Calls", url: "/crm/calls" },
    { title: "Products", url: "/crm/products" },
    { title: "Orders", url: "/crm/orders" },
    { title: "Quotes", url: "/crm/quotes" },
    { title: "Payments", url: "/crm/payments" },
    { title: "Invoices", url: "/crm/invoices" },
    { title: "CRM settings", url: "/crm/settings" },
];

const configurationItems = [
    {title: "Widget Customization",
        url: "/customization",
        icon: BrushIcon,
    },
                    {
        title: "Integrations",
        url: "/integrations",
        icon: ActivityIcon,
    },
            {
        title: "Voice Assistant",
        url: "/plugins/vapi",
        icon: MicVocalIcon,
    },
];

const accoutItems = [
    {
        title: "Plans & Billing",
        url: "/billing",
        icon: CreditCardIcon
    }
]

export const DashboardSidebar = () => {
    const pathname = usePathname();
    const [isCrmMenuOpen, setIsCrmMenuOpen] = useState(false);

    const isActive = (url:string) => {
        if(url === "/"){
            return pathname === "/";
        }
        return pathname.startsWith(url);
    }
    return (
        <Sidebar className="group border-r border-sidebar-border bg-sidebar text-sidebar-foreground" collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="lg">
                            <OrganizationSwitcher
                             hidePersonal
                             skipInvitationScreen
                             appearance={{
                                elements: {
                                    rootBox: "w-full! h-8!",
                                    avatarBox: "size-4! rounded-sm!",
                                    organizationSwitcherTrigger: "w-full! justify-start! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
                                    organizationPreview: "group-data-[collapsible=icon]:justify-center! gap-2!",
                                    organizationPreviewTextContainer: "group-data-[collapsible=icon]:hidden! text-xs! font-medium! text-sidebar-foreground!",
                                    organizationSwitcherTriggerIcon: "group-data-[collapsible=icon]:hidden! ml-auto! text-sidebar-foreground!"
                                }
                             }}
                             />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
           <SidebarContent>
            <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/70">
                    Customer Support
                </SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {customerSupportItems.map((item)=>(
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild
                                isActive={
                                    isActive(item.url)
                                }
                                className={cn(
                                    isActive(item.url) && "bg-sidebar-primary! text-sidebar-primary-foreground! shadow-sm"
                                )}
                                 tooltip={item.title}>
                                    <Link href={item.url}>
                                    <item.icon className="size-4"/>
                                    <span>{item.title}</span>
                                    </Link>

                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/70">
                    CRM
                </SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setIsCrmMenuOpen((v) => !v)}
                                isActive={pathname.startsWith("/crm")}
                                className={cn(
                                    pathname.startsWith("/crm") &&
                                        "bg-sidebar-primary! text-sidebar-primary-foreground! shadow-sm"
                                )}
                                tooltip="CRM modules"
                            >
                                <WorkflowIcon className="size-4" />
                                <span>CRM</span>
                                <ChevronRightIcon
                                    className={cn(
                                        "ml-auto size-4 text-sidebar-foreground/70 transition-transform",
                                        isCrmMenuOpen && "rotate-90"
                                    )}
                                />
                            </SidebarMenuButton>
                            <div
                                className={cn(
                                    "absolute top-full left-0 z-50 mt-1 w-[220px] rounded-md border border-sidebar-border bg-sidebar p-2 shadow-xl",
                                    isCrmMenuOpen ? "block" : "hidden"
                                )}
                            >
                                <div className="grid gap-0.5">
                                    {crmModuleItems.map((item) => (
                                        <Link
                                            key={item.url}
                                            href={item.url}
                                            className={cn(
                                                "block rounded-sm px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent",
                                                (pathname === item.url || pathname.startsWith(`${item.url}/`)) &&
                                                    "bg-sidebar-primary text-sidebar-primary-foreground",
                                            )}
                                        >
                                            {item.title}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/70">
                    Configuration
                </SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {configurationItems.map((item)=>(
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild
                                isActive={
                                    isActive(item.url)
                                }
                                 className={cn(
                                    isActive(item.url) && "bg-sidebar-primary! text-sidebar-primary-foreground! shadow-sm"
                                )}
                                
                                 tooltip={item.title}>
                                    <Link href={item.url}>
                                    <item.icon className="size-4"/>
                                    <span>{item.title}</span>
                                    </Link>

                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
             <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/70">
                    Account
                </SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {accoutItems.map((item)=>(
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild
                                isActive={
                                    isActive(item.url)
                                }
                                 className={cn(
                                    isActive(item.url) && "bg-sidebar-primary! text-sidebar-primary-foreground! shadow-sm"
                                )}
                                 tooltip={item.title}>
                                    <Link href={item.url}>
                                    <item.icon className="size-4"/>
                                    <span>{item.title}</span>
                                    </Link>

                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
           </SidebarContent>
           <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <UserButton
                    showName
                    appearance={{
                        elements: {
                            rootBox : "w-full! h-8!",
                            userButtonTrigger: "w-full! p-2! hover:bg-sidebar-accent! hover:text-sidebar-accent-foreground! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
                            userButtonBox: "w-full! flex-row-reverse! justify-end! gap-2! group-data-[collapsible=icon]:justify-center! text-sidebar-foreground!",
                            userButtonOuterIdentifier: "pl-0! group-data-[collapsible=icon]:hidden!",
                            avatarBox: "size-4!" 
                        }
                    }}
                    />
                </SidebarMenuItem>
            </SidebarMenu>
           </SidebarFooter>
           <SidebarRail/>
        </Sidebar>
    )
}