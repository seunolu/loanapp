import * as React from 'react';
import { Badge, Box, Button, Card, Divider, EmptyState, Input, ListRow, Screen, Text } from '../../../src/ui';

export default function UiPreviewScreen(): React.JSX.Element {
  const [email, setEmail] = React.useState('');

  return (
    <Screen>
      <Text variant="h1">UI Preview</Text>

      <Card>
        <Box gap="sm">
          <Text variant="h2">Buttons</Text>
          <Box row gap="sm" wrap="wrap">
            <Button variant="primary" label="Primary" />
            <Button variant="secondary" label="Secondary" />
            <Button variant="ghost" label="Ghost" />
            <Button variant="danger" label="Danger" />
          </Box>
          <Box row gap="sm">
            <Button loading label="Loading" />
            <Button disabled label="Disabled" />
          </Box>
        </Box>
      </Card>

      <Card>
        <Box gap="sm">
          <Text variant="h2">Input</Text>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            helperText="We use this for account updates."
          />
          <Input label="Password" secureTextEntry value="" onChangeText={() => undefined} errorText="Password is required." />
        </Box>
      </Card>

      <Card>
        <Box gap="sm">
          <Text variant="h2">Badges</Text>
          <Box row gap="sm" wrap="wrap">
            <Badge variant="neutral">PENDING</Badge>
            <Badge variant="info">ACTIVE</Badge>
            <Badge variant="success">PAID</Badge>
            <Badge variant="warning">DUE SOON</Badge>
            <Badge variant="danger">OVERDUE</Badge>
          </Box>
          <Divider />
          <ListRow title="KYC Status" subtitle="Identity verification in review" rightText="Pending" />
        </Box>
      </Card>

      <EmptyState
        title="No active loans"
        message="When your next offer is available, it will appear here."
        actionLabel="Refresh"
        onActionPress={() => undefined}
      />
    </Screen>
  );
}
