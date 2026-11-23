import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import WebViewBase, { type WebViewMessageEvent } from 'react-native-webview';
import { READER_HTML } from '@/reader-engine/readerHtml.generated';
import { RangeReader } from '@/reader-engine/RangeReader';
import type { FromEngine, ReaderAppearance, ToEngine } from '@/reader-engine/protocol';
import { getBookFile } from '@/storage/fileStore';

export interface PdfFlipViewHandle {
  goTo: (page: number) => void;
  next: () => void;
  prev: () => void;
}

interface Props {
  fileName: string;
  startPage: number;
  appearance: ReaderAppearance;
  onLoaded: (totalPages: number, page: number) => void;
  onPageChange: (page: number) => void;
  onToggleControls: () => void;
  onError: (message: string) => void;
}

// react-native-webview's typings default their generic to `undefined`, which makes the props `never`
// under TypeScript 6. Pin the generic to `object` (types only — no runtime change).
const WebView = WebViewBase as typeof WebViewBase<object>;
type WebViewRef = WebViewBase<object>;

// Constant object so the WebView never reloads because of a re-render.
// baseUrl gives the page a normal https origin (needed for blob: workers); nothing is ever fetched from it.
const SOURCE = { html: READER_HTML, baseUrl: 'https://pageturn.invalid/' };

export const PdfFlipView = forwardRef<PdfFlipViewHandle, Props>(function PdfFlipView(props, ref) {
  const webRef = useRef<WebViewRef>(null);
  const readerRef = useRef<RangeReader | null>(null);
  const readyRef = useRef(false);
  const currentPageRef = useRef(props.startPage);
  const propsRef = useRef(props);
  propsRef.current = props;

  const send = useCallback((msg: ToEngine) => {
    webRef.current?.injectJavaScript(`window.PageTurn&&window.PageTurn.receive(${JSON.stringify(msg)});true;`);
  }, []);

  useImperativeHandle(ref, () => ({
    goTo: (page) => send({ type: 'goto', page }),
    next: () => send({ type: 'next' }),
    prev: () => send({ type: 'prev' }),
  }), [send]);

  // Live theme / brightness / contrast changes
  useEffect(() => {
    if (readyRef.current) send({ type: 'appearance', appearance: props.appearance });
  }, [props.appearance, send]);

  useEffect(() => () => readerRef.current?.close(), []);

  const onMessage = useCallback(async (event: WebViewMessageEvent) => {
    let msg: FromEngine;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    const p = propsRef.current;

    switch (msg.type) {
      case 'ready': {
        const file = getBookFile(p.fileName);
        if (!file.exists) {
          p.onError('The book file is missing from this device.');
          return;
        }
        readerRef.current?.close();
        readerRef.current = new RangeReader(file);
        readyRef.current = true;
        send({ type: 'open', size: file.size ?? 0, startPage: currentPageRef.current, appearance: p.appearance });
        break;
      }
      case 'readRange': {
        try {
          const data = await readerRef.current!.read(msg.begin, msg.end);
          send({ type: 'range', id: msg.id, data });
        } catch (error) {
          send({ type: 'rangeError', id: msg.id, message: String(error) });
        }
        break;
      }
      case 'loaded':
        currentPageRef.current = msg.page;
        p.onLoaded(msg.totalPages, msg.page);
        break;
      case 'page':
        currentPageRef.current = msg.page;
        p.onPageChange(msg.page);
        break;
      case 'toggleControls':
        p.onToggleControls();
        break;
      case 'error':
        if (msg.fatal) p.onError(msg.message);
        else console.warn('[reader]', msg.message);
        break;
      case 'log':
        if (__DEV__) console.log(`[reader:${msg.level}]`, msg.message);
        break;
    }
  }, [send]);

  return (
    <WebView
      ref={webRef}
      source={SOURCE}
      originWhitelist={['*']}
      onMessage={onMessage}
      javaScriptEnabled
      scrollEnabled={false}
      overScrollMode="never"
      bounces={false}
      textZoom={100}
      setBuiltInZoomControls={false}
      setSupportMultipleWindows={false}
      allowFileAccess={false}
      androidLayerType="hardware"
      webviewDebuggingEnabled={__DEV__}
      // If Android kills the WebView's renderer (low memory), reload and reopen at the same page.
      onRenderProcessGone={() => {
        readyRef.current = false;
        webRef.current?.reload();
      }}
      style={[styles.web, { backgroundColor: props.appearance.background }]}
      containerStyle={{ backgroundColor: props.appearance.background }}
    />
  );
});

const styles = StyleSheet.create({
  web: { flex: 1 },
});
