/**
 * useKeyboardHeight
 * =================
 * Returns the current keyboard height (0 when hidden).
 *
 * Why not just use KeyboardAvoidingView?
 *   KAV works for simple screens but breaks on floating elements like
 *   the Chatbot input bar (positioned above the tab bar) or modals
 *   inside ScrollViews. Reading the height directly lets the screen
 *   animate exactly what it wants to animate.
 *
 * Android vs iOS:
 *   - iOS fires keyboardWillShow/Hide (better — animates with keyboard)
 *   - Android only fires keyboardDidShow/Hide (fires AFTER keyboard appears)
 *   Both platforms work fine — just iOS feels a bit smoother.
 *
 * Returns:
 *   height   — current keyboard height in dp (0 when hidden)
 *   isVisible — boolean
 */

import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export default function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      // e.endCoordinates.height is the keyboard's height in dp
      setHeight(e?.endCoordinates?.height ?? 0);
    };
    const onHide = () => setHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return { height, isVisible: height > 0 };
}
