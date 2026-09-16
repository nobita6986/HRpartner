import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import React from 'react';
import { Breadcrumb } from './navigation/breadcrumb';
import { RelatedObjects } from './data-display/related-objects';
import { EmptyState } from './data-display/empty-state';
import { RowLink } from './navigation/row-link';

describe('Admin Detail Foundation UI Components', () => {
  beforeAll(() => {
    vi.spyOn(React, 'useId').mockReturnValue('mocked-id');
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Breadcrumb', () => {
    it('renders semantic nav and aria-current for the last item', () => {
      const items = [
        { label: 'Home', href: '/' },
        { label: 'Detail' }
      ];
      const el = Breadcrumb({ items });
      expect(el.type).toBe('nav');
      expect(el.props['aria-label']).toBe('Breadcrumb');

      const ol = el.props.children;
      expect(ol.type).toBe('ol');

      const lis = ol.props.children;
      expect(lis.length).toBe(2);

      const lastLi = lis[1];
      const lastItemSpan = lastLi.props.children.find((c: any) => c && c.props && c.props['aria-current'] === 'page');
      expect(lastItemSpan).toBeTruthy();
    });
  });

  describe('RelatedObjects', () => {
    it('renders status text, handles href/no-href, and empty state', () => {
      const emptyEl = RelatedObjects({ title: 'Test', items: [], emptyState: 'No items' });
      const emptyChildren = emptyEl.props.children;
      expect(emptyChildren[1].props.children).toBe('No items');
      expect(emptyEl.props['aria-labelledby']).toBe('mocked-id');

      const items = [
        { id: '1', title: 'Item 1', statusLabel: 'Active', statusColor: { bg: 'green', fg: 'white' }, href: '/1' },
        { id: '2', title: 'Item 2', statusLabel: 'Inactive' }
      ];
      const el = RelatedObjects({ title: 'Test', items });
      const ul = el.props.children[1];
      expect(ul.type).toBe('ul');

      const liNodes = ul.props.children;
      expect(liNodes.length).toBe(2);

      const item1Content = liNodes[0].props.children; // This is the Link
      expect(item1Content.type.$$typeof.toString()).toContain('react.forward_ref');
      expect(item1Content.props.href).toBe('/1');

      const item2Content = liNodes[1].props.children; // This is the div (content) directly
      expect(item2Content.type).toBe('div');

      const contentDiv1 = item1Content.props.children; // The content div wrapped in Link
      const status1 = contentDiv1.props.children[1]; // The span
      expect(status1.props.children).toBe('Active');

      const contentDiv2 = item2Content; // No link, it's just the content div
      const status2 = contentDiv2.props.children[1];
      expect(status2.props.children).toBe('Inactive');
    });
  });

  describe('EmptyState', () => {
    it('renders action when provided and no-action when not provided', () => {
      const el = EmptyState({ title: 'No Data', description: 'Check back later' });
      const children = el.props.children;
      expect(children[1].props.children).toBe('No Data');
      expect(children[2].props.children).toBe('Check back later');
      expect(children.length).toBe(4);
      expect(children[3]).toBeFalsy();

      const actionEl = EmptyState({ title: 'No Data', description: 'With action', action: { label: 'Create', href: '/create' } });
      const actionChildren = actionEl.props.children;
      const linkEl = actionChildren[3];
      expect(linkEl).toBeTruthy();
      expect(linkEl.type.$$typeof.toString()).toContain('react.forward_ref');
      expect(linkEl.props.href).toBe('/create');
      expect(linkEl.props.children).toBe('Create');
    });
  });

  describe('RowLink', () => {
    it('renders href and accessibility markup correctly', () => {
      const el = RowLink({ href: '/target', children: React.createElement('span', { className: 'sr-only' }, 'Go to target') });
      expect(el.type.$$typeof.toString()).toContain('react.forward_ref');
      expect(el.props.href).toBe('/target');
      
      const span = el.props.children;
      expect(span.type).toBe('span');
      expect(span.props.className).toContain('sr-only');
      expect(span.props.children).toBe('Go to target');
      
      expect(el.props.className).toContain('before:absolute');
      expect(el.props.className).toContain('before:inset-0');
    });
  });
});
