import React, {useCallback, useEffect, useRef} from 'react';
import {Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, type ScrollViewInstance, type ScrollViewProps} from 'react-native';

export function KeyboardAwareScrollView({onFocus, onLayout, onScroll, style, ...props}: ScrollViewProps): React.JSX.Element {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollOffset = useRef(0);
  const frame = useRef<number | null>(null);
  const revealFocusedInput = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const input = TextInput.State.currentlyFocusedInput();
      if (input && Keyboard.isVisible()) {
        input.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
          scrollRef.current?.measureInWindow((_scrollX, scrollY, _scrollWidth, scrollHeight) => {
            const keyboardTop = Keyboard.metrics()?.screenY ?? scrollY + scrollHeight;
            const visibleBottom = Math.min(keyboardTop, scrollY + scrollHeight) - 24;
            const overlap = inputY + inputHeight - visibleBottom;
            if (overlap > 0) scrollRef.current?.scrollTo({y: scrollOffset.current + overlap, animated: true});
          });
        });
      }
    });
  }, []);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', revealFocusedInput);
    const changed = Keyboard.addListener('keyboardDidChangeFrame', revealFocusedInput);
    return () => {
      shown.remove();
      changed.remove();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [revealFocusedInput]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        {...props}
        ref={scrollRef}
        style={[styles.container, style]}
        keyboardShouldPersistTaps="handled"
        onFocus={event => {onFocus?.(event); revealFocusedInput();}}
        onLayout={event => {onLayout?.(event); revealFocusedInput();}}
        scrollEventThrottle={16}
        onScroll={event => {scrollOffset.current = event.nativeEvent.contentOffset.y; onScroll?.(event);}}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({container: {flex: 1}});
