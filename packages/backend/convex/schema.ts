import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    subscriptions: defineTable({
            organizationId: v.string(),
            status: v.string(),
    })
    .index("by_organization_id", ["organizationId"]),
    widgetSettings: defineTable({
        organizationId: v.string(),
        greetMessage: v.string(),
        defaultSuggestions: v.object({
            suggestion1: v.optional(v.string()),
            suggestion2: v.optional(v.string()),
            suggestion3: v.optional(v.string()),
        }),
        /** Up to 5 quick replies; takes precedence over defaultSuggestions when set. */
        quickReplies: v.optional(v.array(v.string())),
        /** When false, chips are hidden in the widget (text is preserved). */
        quickRepliesEnabled: v.optional(v.boolean()),
        vapiSettings: v.object({
            assistantId: v.optional(v.string()),
            phoneNumber: v.optional(v.string()),
        }),
        widgetColor: v.optional(v.string()),
        blogLinks: v.optional(
            v.array(
                v.object({
                    title: v.string(),
                    url: v.string(),
                })
            )
        ),
        faqs: v.optional(
            v.array(
                v.object({
                    question: v.string(),
                    answer: v.string(),
                })
            )
        ),
        news: v.optional(
            v.array(
                v.object({
                    title: v.string(),
                    description: v.string(),
                    imageUrl: v.string(),
                    link: v.optional(v.string()),
                })
            )
        ),
        guidedQualificationFlow: v.optional(v.any()),
    })
    .index("by_organization_id", ["organizationId"]),
    plugins: defineTable({
        organizationId: v.string(),
        service: v.union(v.literal("vapi")),
        secretName: v.string(),
    })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_and_service", ["organizationId", "service"]),

    conversations: defineTable({
        threadId: v.string(),
        organizationId: v.string(),
        contactSessionId: v.id("contactSessions"),
        assignedToUserId: v.optional(v.string()),
        slaDueAt: v.optional(v.number()),
        status: v.union(
            v.literal("unresolved"),
            v.literal("escalated"),
            v.literal("resolved")
        )
    }).index("by_organization_id", ["organizationId"])
      .index("by_contact_session_id", ["contactSessionId"])
      .index("by_thread_id", ["threadId"])
      .index("by_status_and_organization_id", ["status", "organizationId"])  
    ,
    contactSessions: defineTable({
        name: v.string(),
        email: v.string(),
        organizationId: v.string(),
        expiresAt: v.number(),
        metadata: v.optional(v.object({
            userAgent: v.optional(v.string()),
            language: v.optional(v.string()),
            languages: v.optional(v.string()),
            platform: v.optional(v.string()),
            vendor: v.optional(v.string()),
            screenResolution: v.optional(v.string()),
            viewportSize: v.optional(v.string()),
            timezone: v.optional(v.string()),
            timezoneOffset: v.optional(v.number()),
            cookieEnabled: v.optional(v.boolean()),
            referrer: v.optional(v.string()),
            currentUrl: v.optional(v.string()),
        }))

    })
    .index("by_organization_id", ["organizationId"])
    .index("by_expires_at", ["expiresAt"]),

    // ----------------------------
    // CRM (Zoho-like modules)
    // ----------------------------
    leads: defineTable({
        organizationId: v.string(),
        /** Display / lead name */
        name: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        whatsapp: v.optional(v.string()),
        company: v.optional(v.string()),
        /** Pipeline status (simplified set). Legacy values may exist until migrated. */
        stage: v.union(
            v.literal("New"),
            v.literal("Contacted"),
            v.literal("Qualified"),
            v.literal("Lost"),
            v.literal("Proposal"),
            v.literal("Negotiation"),
            v.literal("Closed Won"),
            v.literal("Closed Lost"),
        ),
        leadSource: v.optional(v.string()),
        /** Street / multi-line address */
        address: v.optional(v.string()),
        /** Clerk user id when assigned to an org member */
        assignedToUserId: v.optional(v.string()),
        /** Display label for assigned rep (member name or free text) */
        assignedToName: v.optional(v.string()),
        /** Unix ms — last outreach / touch */
        lastContactedAt: v.optional(v.number()),
        leadScore: v.optional(v.number()),
        expectedDealValue: v.optional(v.number()),
        productInterest: v.optional(v.string()),
        // Company (Zoho-style)
        industry: v.optional(v.string()),
        organizationOffer: v.optional(v.string()),
        sellToDescription: v.optional(v.string()),
        website: v.optional(v.string()),
        g2CapterraNotes: v.optional(v.string()),
        domainAge: v.optional(v.string()),
        employeeCount: v.optional(v.string()),
        // Person
        salutation: v.optional(v.string()),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        title: v.optional(v.string()),
        linkedIn: v.optional(v.string()),
        headline: v.optional(v.string()),
        emailValidation: v.optional(v.string()),
        zohoAssessmentCompleted: v.optional(v.boolean()),
        linkedInConnections: v.optional(v.string()),
        linkedInFollowers: v.optional(v.string()),
        // Tracking / UTM
        utmCampaign: v.optional(v.string()),
        utmMedium: v.optional(v.string()),
        referralUrl: v.optional(v.string()),
        utmTerm: v.optional(v.string()),
        utmContent: v.optional(v.string()),
        ipAddress: v.optional(v.string()),
        conversion: v.optional(v.string()),
        referredOut: v.optional(v.boolean()),
        /** User-defined field values keyed by `crmLeadCustomFields.key` (all string-encoded). */
        customValues: v.optional(v.record(v.string(), v.string())),
    }).index("by_organization_id", ["organizationId"])
      .index("by_organization_id_and_stage", ["organizationId", "stage"]),

    crmLeadCustomFields: defineTable({
        organizationId: v.string(),
        /** Stable id for storage in `leads.customValues` */
        key: v.string(),
        label: v.string(),
        fieldType: v.union(
            v.literal("text"),
            v.literal("textarea"),
            v.literal("number"),
            v.literal("date"),
            v.literal("select"),
            v.literal("checkbox"),
        ),
        selectOptions: v.optional(v.array(v.string())),
        required: v.boolean(),
        sortOrder: v.number(),
        createdAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_organization_id_and_key", ["organizationId", "key"]),

    accounts: defineTable({
        organizationId: v.string(),
        name: v.string(),
        website: v.optional(v.string()),
        industry: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
    }).index("by_organization_id", ["organizationId"]),

    contacts: defineTable({
        organizationId: v.string(),
        accountId: v.optional(v.id("accounts")),
        firstName: v.string(),
        lastName: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        title: v.optional(v.string()),
    }).index("by_organization_id", ["organizationId"])
      .index("by_account_id", ["accountId"]),

    deals: defineTable({
        organizationId: v.string(),
        accountId: v.optional(v.id("accounts")),
        contactId: v.optional(v.id("contacts")),
        leadId: v.optional(v.id("leads")),
        name: v.string(),
        amount: v.number(),
        stage: v.union(
            v.literal("Prospecting"),
            v.literal("Qualification"),
            v.literal("Proposal"),
            v.literal("Negotiation"),
            v.literal("Closed Won"),
            v.literal("Closed Lost"),
        ),
        closeDate: v.optional(v.number()),
        probability: v.optional(v.number()),
    }).index("by_organization_id", ["organizationId"])
      .index("by_organization_id_and_stage", ["organizationId", "stage"]),

    activities: defineTable({
        organizationId: v.string(),
        type: v.union(
            v.literal("task"),
            v.literal("call"),
            v.literal("email"),
            v.literal("meeting"),
        ),
        subject: v.string(),
        description: v.optional(v.string()),
        dueAt: v.optional(v.number()),
        status: v.union(
            v.literal("open"),
            v.literal("completed"),
            v.literal("cancelled"),
        ),
        relatedLeadId: v.optional(v.id("leads")),
        relatedDealId: v.optional(v.id("deals")),
        relatedContactId: v.optional(v.id("contacts")),
        relatedAccountId: v.optional(v.id("accounts")),
        assignee: v.optional(v.string()),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_organization_id_and_type", ["organizationId", "type"])
        .index("by_related_lead_id", ["relatedLeadId"])
        .index("by_related_contact_id", ["relatedContactId"])
        .index("by_related_account_id", ["relatedAccountId"])
        .index("by_org_and_related_lead", ["organizationId", "relatedLeadId"])
        .index("by_org_and_related_contact", ["organizationId", "relatedContactId"])
        .index("by_org_and_related_account", ["organizationId", "relatedAccountId"]),

    notes: defineTable({
        organizationId: v.string(),
        subject: v.optional(v.string()),
        body: v.string(),
        relatedLeadId: v.optional(v.id("leads")),
        relatedDealId: v.optional(v.id("deals")),
        relatedContactId: v.optional(v.id("contacts")),
        relatedAccountId: v.optional(v.id("accounts")),
    }).index("by_organization_id", ["organizationId"]),

    campaigns: defineTable({
        organizationId: v.string(),
        name: v.string(),
        status: v.union(
            v.literal("planned"),
            v.literal("active"),
            v.literal("completed"),
            v.literal("paused"),
        ),
        startAt: v.optional(v.number()),
        endAt: v.optional(v.number()),
        description: v.optional(v.string()),
    }).index("by_organization_id", ["organizationId"]),

    /** Manual revenue / sales log (separate from deal pipeline). */
    crmSalesEntries: defineTable({
        organizationId: v.string(),
        /** UTC midnight for the sale calendar day (YYYY-MM-DD from CRM form → UTC). */
        saleDate: v.number(),
        amount: v.number(),
        title: v.optional(v.string()),
        soldTo: v.optional(v.string()),
        customerIndustry: v.optional(v.string()),
        customerName: v.optional(v.string()),
        companyName: v.optional(v.string()),
        customerContact: v.optional(v.string()),
        customerEmail: v.optional(v.string()),
        customerWhatsapp: v.optional(v.string()),
        notes: v.optional(v.string()),
        dealId: v.optional(v.id("deals")),
        accountId: v.optional(v.id("accounts")),
        createdByUserId: v.string(),
        createdAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_org_and_sale_date", ["organizationId", "saleDate"]),

    crmModuleItems: defineTable({
        organizationId: v.string(),
        module: v.union(
            v.literal("products"),
            v.literal("quotes"),
            v.literal("orders"),
            v.literal("invoices"),
            v.literal("payments"),
            v.literal("contracts"),
            v.literal("documents"),
            v.literal("webforms"),
            v.literal("approvals"),
            v.literal("automation"),
            v.literal("integrations"),
        ),
        title: v.string(),
        status: v.optional(v.string()),
        amount: v.optional(v.number()),
        dueAt: v.optional(v.number()),
        details: v.optional(v.string()),
        sku: v.optional(v.string()),
        productDescription: v.optional(v.string()),
        productUrl: v.optional(v.string()),
        unitPrice: v.optional(v.number()),
        unitCost: v.optional(v.number()),
        productType: v.optional(
            v.union(
                v.literal("inventory"),
                v.literal("non_inventory"),
                v.literal("service"),
            ),
        ),
        /** On-hand quantity for inventory-style products (optional). */
        stockQuantity: v.optional(v.number()),
        /** Product photo stored in Convex file storage (set via file upload, not a public URL field). */
        productImageId: v.optional(v.id("_storage")),
        createdAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_organization_id_and_module", ["organizationId", "module"]),

    crmSettings: defineTable({
        organizationId: v.string(),
        defaultCurrency: v.string(),
        taxRate: v.number(),
        fiscalYearStartMonth: v.number(),
        autoNumbering: v.boolean(),
        pipelineStages: v.optional(
            v.array(
                v.object({
                    key: v.string(),
                    label: v.string(),
                    order: v.number(),
                    probability: v.optional(v.number()),
                }),
            ),
        ),
    }).index("by_organization_id", ["organizationId"]),

    crmUserRoles: defineTable({
        organizationId: v.string(),
        userId: v.string(),
        role: v.union(v.literal("admin"), v.literal("agent"), v.literal("viewer")),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_organization_id_and_user_id", ["organizationId", "userId"]),

    auditEvents: defineTable({
        organizationId: v.string(),
        userId: v.string(),
        entityType: v.string(),
        entityId: v.string(),
        action: v.union(
            v.literal("create"),
            v.literal("update"),
            v.literal("delete"),
            v.literal("stage_change"),
            v.literal("link"),
            v.literal("status_change"),
        ),
        changes: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_organization_id_and_entity", ["organizationId", "entityType", "entityId"]),

    crmConversationLinks: defineTable({
        organizationId: v.string(),
        conversationId: v.id("conversations"),
        leadId: v.optional(v.id("leads")),
        activityId: v.optional(v.id("activities")),
        createdByUserId: v.string(),
        createdAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_conversation_id", ["conversationId"]),

    leadStageHistory: defineTable({
        organizationId: v.string(),
        leadId: v.id("leads"),
        fromStage: v.optional(v.string()),
        toStage: v.string(),
        changedByUserId: v.string(),
        changedAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_lead_id", ["leadId"]),

    dealStageHistory: defineTable({
        organizationId: v.string(),
        dealId: v.id("deals"),
        fromStage: v.optional(v.string()),
        toStage: v.string(),
        changedByUserId: v.string(),
        changedAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_deal_id", ["dealId"]),

    crmQueues: defineTable({
        organizationId: v.string(),
        name: v.string(),
        isDefault: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"]),

    crmQueueMembers: defineTable({
        organizationId: v.string(),
        queueId: v.id("crmQueues"),
        userId: v.string(),
        createdAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_queue_id", ["queueId"]),

    crmSlaPolicies: defineTable({
        organizationId: v.string(),
        firstResponseMinutes: v.number(),
        resolveMinutes: v.number(),
        businessHoursOnly: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index("by_organization_id", ["organizationId"]),

    crmGoogleConnections: defineTable({
        organizationId: v.string(),
        userId: v.string(),
        email: v.optional(v.string()),
        secretName: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_organization_id_and_user_id", ["organizationId", "userId"]),

    crmWebhookSubscriptions: defineTable({
        organizationId: v.string(),
        url: v.string(),
        secret: v.string(),
        eventTypes: v.array(v.string()),
        active: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index("by_organization_id", ["organizationId"]),

    crmWebhookEvents: defineTable({
        organizationId: v.string(),
        subscriptionId: v.id("crmWebhookSubscriptions"),
        eventType: v.string(),
        payload: v.string(),
        status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
        createdAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_subscription_id", ["subscriptionId"]),

    crmApiKeys: defineTable({
        organizationId: v.string(),
        name: v.string(),
        keyHash: v.string(),
        scopes: v.array(v.string()),
        active: v.boolean(),
        createdAt: v.number(),
    }).index("by_organization_id", ["organizationId"]),

    customCrmModules: defineTable({
        organizationId: v.string(),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        color: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_organization_id_and_slug", ["organizationId", "slug"]),

    customCrmRecords: defineTable({
        organizationId: v.string(),
        moduleId: v.id("customCrmModules"),
        title: v.string(),
        status: v.optional(v.string()),
        amount: v.optional(v.number()),
        dueAt: v.optional(v.number()),
        details: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_module_id", ["moduleId"]),

    users: defineTable({
        name: v.string(),
    }),

    analyticsSites: defineTable({
        organizationId: v.string(),
        domain: v.string(),
        ingestKey: v.string(),
        createdAt: v.number(),
    })
        .index("by_organization_id", ["organizationId"])
        .index("by_ingest_key", ["ingestKey"]),

    analyticsSessions: defineTable({
        siteId: v.id("analyticsSites"),
        clientSessionId: v.string(),
        startedAt: v.number(),
        durationMs: v.number(),
        country: v.optional(v.string()),
        lastPath: v.optional(v.string()),
    })
    .index("by_site", ["siteId"])
    .index("by_site_and_client_session", ["siteId", "clientSessionId"]),

    /** Gmail bulk sends triggered at `scheduledAt` by scheduler → googleEmail.executeScheduledBulkEmail */
    scheduledBulkEmails: defineTable({
        organizationId: v.string(),
        userId: v.string(),
        internalTitle: v.optional(v.string()),
        subject: v.string(),
        body: v.string(),
        previewText: v.optional(v.string()),
        /** Hero image from Convex file storage (upload in composer). */
        imageStorageId: v.optional(v.id("_storage")),
        /** Optional CTA — merge tags supported; URL must be https:// after merge. */
        buttonLabel: v.optional(v.string()),
        buttonUrl: v.optional(v.string()),
        /** Optional footer social links (https URLs). */
        socialLinks: v.optional(
            v.array(
                v.object({
                    platform: v.union(
                        v.literal("facebook"),
                        v.literal("twitter"),
                        v.literal("linkedin"),
                        v.literal("instagram"),
                        v.literal("youtube"),
                    ),
                    url: v.string(),
                }),
            ),
        ),
        /** HTML palette: colors, top bar, pill vs outline CTA. */
        emailTheme: v.optional(
            v.union(
                v.literal("indigo"),
                v.literal("coral"),
                v.literal("royal"),
                v.literal("lavender"),
                v.literal("noir"),
                v.literal("jade"),
                v.literal("summit"),
                v.literal("sunrise"),
                v.literal("activation"),
            ),
        ),
        /** Dark top ribbon for event (brand_bar) themes — merge tags supported. */
        brandBarTitle: v.optional(v.string()),
        /** Sunrise promo hero — merge tags supported. */
        promoHeadline: v.optional(v.string()),
        promoDiscount: v.optional(v.string()),
        recipients: v.array(
            v.object({
                email: v.string(),
                firstName: v.optional(v.string()),
                lastName: v.optional(v.string()),
                name: v.optional(v.string()),
                company: v.optional(v.string()),
            }),
        ),
        /** Unix ms UTC — Convex scheduler fires at this time */
        scheduledAt: v.number(),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed"),
            v.literal("cancelled"),
        ),
        schedulerJobId: v.optional(v.string()),
        createdAt: v.number(),
        completedAt: v.optional(v.number()),
        sentCount: v.optional(v.number()),
        failedCount: v.optional(v.number()),
        lastError: v.optional(v.string()),
    })
        .index("by_organization_id_and_user_id", ["organizationId", "userId"])
        .index("by_organization_id", ["organizationId"]),
});