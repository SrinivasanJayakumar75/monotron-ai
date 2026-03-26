

export const ConversationsView = () => {
    return (
        <div className="flex h-full flex-1 flex-col gap-y-4 bg-gradient-to-b from-slate-50 to-slate-100/70">
            <div className="flex flex-1 items-center justify-center px-6">
                <div className="max-w-md rounded-2xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-sm backdrop-blur">
                    <p className="text-lg font-semibold text-slate-900">Conversations</p>
                    <p className="mt-2 text-sm text-slate-600">
                        Select a conversation from the left panel to view messages and respond.
                    </p>
                </div>
            </div>

        </div>
    )
}