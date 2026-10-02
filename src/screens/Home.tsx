import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ALL_ITEMS, SECTIONS, type Item } from '../checklist';
import { useStore } from '../store';
import { Banner, Button, C, Card, H1, H2, P, Pill, Row, Screen } from '../ui';
import type { Stack } from '../nav';

export function HomeScreen({ navigation }: NativeStackScreenProps<Stack, 'Home'>) {
  const { results, notice, setNotice } = useStore();
  const passed = ALL_ITEMS.filter((i) => results[i.id]?.passed).length;

  return (
    <Screen>
      <H1>Deep-link test checklist</H1>
      <P muted>
        Each row is one way a link can open this app. Do the steps under a row; it turns green by
        itself when the app sees it work. Tap a row for steps.
      </P>
      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: C.ink }}>
          {passed}
          <Text style={{ fontSize: 16, color: C.muted }}> / {ALL_ITEMS.length} passed</Text>
        </Text>
        <View style={{ width: 120, height: 8, borderRadius: 4, backgroundColor: C.idleBg }}>
          <View style={{ width: `${(passed / ALL_ITEMS.length) * 100}%`, height: 8, borderRadius: 4, backgroundColor: C.ok }} />
        </View>
      </Card>
      {notice && (
        <Pressable onPress={() => setNotice(null)}>
          <Banner text={`${notice}  (tap to dismiss)`} />
        </Pressable>
      )}
      <Row>
        <Button title="Test links" onPress={() => navigation.navigate('TestLinks')} />
        <Button title="Link Inspector" kind="ghost" onPress={() => navigation.navigate('Inspector')} />
        <Button title="Fingerprint" kind="ghost" onPress={() => navigation.navigate('Fingerprint')} />
        <Button title="Settings" kind="ghost" onPress={() => navigation.navigate('Settings')} />
      </Row>
      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <H2>{section.title}</H2>
          <P muted>{section.intro}</P>
          {section.items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </Card>
      ))}
    </Screen>
  );
}

function ItemRow({ item }: { item: Item }) {
  const { results } = useStore();
  const [open, setOpen] = useState(false);
  const r = results[item.id];
  return (
    <Pressable onPress={() => setOpen(!open)} style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: C.ink }}>{item.title}</Text>
        <Pill state={r?.passed ? 'passed' : 'idle'} />
      </View>
      {open && (
        <View style={{ gap: 4 }}>
          {item.how.map((step, i) => (
            <Text key={i} style={{ fontSize: 13.5, color: C.ink }}>
              {i + 1}. {step}
            </Text>
          ))}
          {r && (
            <Text style={{ fontSize: 12.5, color: C.ok }}>
              Proof: {r.detail} ({new Date(r.at).toLocaleTimeString()})
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}
