import { Component } from '@geajs/core'
import Badge from '@geajs/ui/badge'
import Button from '@geajs/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@geajs/ui/card'
import Progress from '@geajs/ui/progress'
import Separator from '@geajs/ui/separator'
import Switch from '@geajs/ui/switch'
import Tabs from '@geajs/ui/tabs'
import { ToastStore } from '@geajs/ui/toast'
import store from './store'

export default class SettingsView extends Component {
  template() {
    return (
      <div class="view-content">
        <div class="view-header">
          <h2 class="view-title">Settings</h2>
          <p class="view-desc">Manage your account preferences.</p>
        </div>

        <Tabs
          defaultValue="notifications"
          items={[
            {
              value: 'notifications',
              label: 'Notifications',
              content: (
                <div class="settings-section">
                  <Card>
                    <CardHeader>
                      <CardTitle>Email Notifications</CardTitle>
                      <CardDescription>Choose which emails you'd like to receive.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div class="setting-row">
                        <div class="setting-info">
                          <span class="setting-label">Product updates</span>
                          <span class="setting-desc">Receive emails about new features and improvements.</span>
                        </div>
                        <Switch
                          defaultChecked={store.emailNotifications}
                          onCheckedChange={(d: any) => {
                            store.emailNotifications = d.checked
                          }}
                        />
                      </div>
                      <Separator />
                      <div class="setting-row">
                        <div class="setting-info">
                          <span class="setting-label">Marketing emails</span>
                          <span class="setting-desc">Receive tips, promotions, and offers.</span>
                        </div>
                        <Switch
                          defaultChecked={store.marketingEmails}
                          onCheckedChange={(d: any) => {
                            store.marketingEmails = d.checked
                          }}
                        />
                      </div>
                      <Separator />
                      <div class="setting-row">
                        <div class="setting-info">
                          <span class="setting-label">Weekly digest</span>
                          <span class="setting-desc">A summary of activity every Monday.</span>
                        </div>
                        <Switch
                          defaultChecked={store.weeklyDigest}
                          onCheckedChange={(d: any) => {
                            store.weeklyDigest = d.checked
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ),
            },
            {
              value: 'security',
              label: 'Security',
              content: (
                <div class="settings-section">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Security</CardTitle>
                      <CardDescription>Protect your account with additional security.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div class="setting-row">
                        <div class="setting-info">
                          <span class="setting-label">Two-factor authentication</span>
                          <span class="setting-desc">Add an extra layer of security to your account.</span>
                        </div>
                        <Switch
                          defaultChecked={store.twoFactor}
                          onCheckedChange={(d: any) => {
                            store.twoFactor = d.checked
                            ToastStore.success({
                              title: '2FA ' + (d.checked ? 'enabled' : 'disabled'),
                              description: d.checked ? 'Your account is now more secure.' : '2FA has been turned off.',
                            })
                          }}
                        />
                      </div>
                      <Separator />
                      <div class="settings-action-row">
                        <div class="setting-info">
                          <span class="setting-label">Password</span>
                          <span class="setting-desc">Last changed 3 months ago.</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          click={() =>
                            ToastStore.info({
                              title: 'Email sent',
                              description: 'Check your inbox for a password reset link.',
                            })
                          }
                        >
                          Change Password
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ),
            },
            {
              value: 'billing',
              label: 'Billing',
              content: (
                <div class="settings-section">
                  <Card>
                    <CardHeader>
                      <CardTitle>Billing & Plan</CardTitle>
                      <CardDescription>Manage your subscription and payment methods.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div class="billing-plan">
                        <div class="plan-badge-row">
                          <Badge>Pro Plan</Badge>
                          <span class="plan-price">$49 / month</span>
                        </div>
                        <Progress value={72} class="mt-3" />
                        <p class="plan-usage">72% of your 10 seat limit used ({store.users.length} / 10 users)</p>
                      </div>
                      <Separator class="my-4" />
                      <Button
                        variant="outline"
                        click={() =>
                          ToastStore.info({ title: 'Opening portal', description: 'Redirecting to billing portal…' })
                        }
                      >
                        Manage Subscription
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </div>
    )
  }
}
