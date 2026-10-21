import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Check, Plus } from './icons';
import { Sheet, toast } from './Overlay';
import { Button, Txt } from './ui';
import { useTheme, fonts, radius } from '../theme/tokens';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';

export function CollectionSheet({ visible, onClose, conceptId }: { visible: boolean; onClose: () => void; conceptId?: string }) {
  const { c } = useTheme();
  const { t } = useT();
  const collections = useApp((s) => s.collections);
  const create = useApp((s) => s.createCollection);
  const toggle = useApp((s) => s.toggleInCollection);
  const [name, setName] = useState('');
  return (
    <Sheet visible={visible} onClose={onClose} title={conceptId ? t('word.addToCollection') : t('dictionary.newCollection')}>
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        {conceptId &&
          collections.map((col) => {
            const inside = col.conceptIds.includes(conceptId);
            return (
              <Pressable key={col.id} onPress={() => toggle(col.id, conceptId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, paddingHorizontal: 14, borderRadius: radius.s, backgroundColor: c.surfaceAlt }}>
                <Txt v="bodyMedium" style={{ flex: 1 }}>{col.name}</Txt>
                <Txt v="caption" color={c.textSecondary}>{col.conceptIds.length}</Txt>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: inside ? c.accent : 'transparent', borderWidth: inside ? 0 : 1.5, borderColor: c.divider, alignItems: 'center', justifyContent: 'center' }}>
                  {inside && <Check size={14} color={c.onAccent} />}
                </View>
              </Pressable>
            );
          })}
        <Txt v="captionMedium" color={c.textSecondary} style={{ marginTop: 8 }}>{t('dictionary.collectionName')}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('dictionary.collectionPlaceholder')}
            placeholderTextColor={c.textTertiary}
            style={{ flex: 1, height: 48, borderRadius: radius.s, backgroundColor: c.surfaceAlt, paddingHorizontal: 14, color: c.text, fontFamily: fonts.regular, fontSize: 16 }}
          />
          <Button
            title={t('common.create')}
            size="m"
            icon={<Plus size={16} color={c.onAccent} />}
            disabled={!name.trim()}
            style={{ height: 48 }}
            onPress={() => {
              create(name.trim(), conceptId ? [conceptId] : []);
              toast(name.trim());
              setName('');
              if (!conceptId) onClose();
            }}
          />
        </View>
      </View>
    </Sheet>
  );
}
