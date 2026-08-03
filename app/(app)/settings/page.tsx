import { Header } from '@/components/shell/header'
import { SettingsForm } from '@/components/features/settings/settings-form'
import { getProfile } from '@/lib/db/queries'

export default async function SettingsPage() {
  const profile = await getProfile()

  return (
    <>
      <Header title="Settings" />
      <SettingsForm
        unit={profile?.unit_system ?? 'metric'}
        defaultRestSeconds={profile?.default_rest_seconds ?? 120}
        weekStartsOn={profile?.week_starts_on ?? 1}
      />
    </>
  )
}
