/**
 * Signature Pad Component
 *
 * Simple signature capture area for work order completion.
 * Uses PanResponder to track finger/stylus movements.
 *
 * Note: For MVP, this captures signature strokes data.
 * Full image generation will use react-native-signature-canvas in Phase 2.
 *
 * @module components/ui/SignaturePad
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import { TOUCH_TARGETS } from '@/constants';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
}

interface SignaturePadProps {
  /** Called when signature is confirmed with the stroke data */
  onCapture: (signatureData: string) => void;
  /** Called when signature is cancelled */
  onCancel: () => void;
  /** Whether the pad is disabled (signature already captured) */
  disabled?: boolean;
  /** Previously captured signature data (for display) */
  existingSignature?: string | null;
}

/**
 * Signature pad component for capturing technician signatures
 */
export function SignaturePad({
  onCapture,
  onCancel,
  disabled = false,
  existingSignature,
}: SignaturePadProps): React.ReactElement {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [hasSignature, setHasSignature] = useState(!!existingSignature);
  const containerRef = useRef<View>(null);
  const containerLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleLayout = useCallback((event: { nativeEvent: { layout: { x: number; y: number; width: number; height: number } } }) => {
    containerLayoutRef.current = event.nativeEvent.layout;
  }, []);

  const getPointFromEvent = useCallback(
    (event: GestureResponderEvent): Point => {
      const { pageX, pageY } = event.nativeEvent;
      const layout = containerLayoutRef.current;
      return {
        x: pageX - layout.x,
        y: pageY - layout.y,
      };
    },
    []
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (event: GestureResponderEvent) => {
        const point = getPointFromEvent(event);
        setCurrentStroke([point]);
      },
      onPanResponderMove: (event: GestureResponderEvent) => {
        const point = getPointFromEvent(event);
        setCurrentStroke((prev) => [...prev, point]);
      },
      onPanResponderRelease: () => {
        if (currentStroke.length > 0) {
          setStrokes((prev) => [...prev, { points: currentStroke }]);
          setCurrentStroke([]);
          setHasSignature(true);
        }
      },
    })
  ).current;

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
    setHasSignature(false);
  };

  const handleConfirm = () => {
    if (!hasSignature && strokes.length === 0) {
      return;
    }

    // Serialize strokes to JSON string for storage
    // In Phase 2, this will be converted to an actual image
    const signatureData = JSON.stringify({
      strokes,
      timestamp: Date.now(),
      version: 1,
    });

    onCapture(signatureData);
  };

  // Render strokes as simple visual feedback
  const renderStrokes = () => {
    const allStrokes = [...strokes, { points: currentStroke }];

    return allStrokes.map((stroke, strokeIndex) => {
      if (stroke.points.length < 2) return null;

      return stroke.points.slice(1).map((point, pointIndex) => {
        const prevPoint = stroke.points[pointIndex];
        // prevPoint is guaranteed to exist since we slice from index 1
        if (!prevPoint) return null;
        const dx = point.x - prevPoint.x;
        const dy = point.y - prevPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <View
            key={`${strokeIndex}-${pointIndex}`}
            style={[
              styles.strokeLine,
              {
                left: prevPoint.x,
                top: prevPoint.y - 1.5,
                width: length,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      });
    });
  };

  if (disabled && existingSignature) {
    return (
      <View style={styles.container}>
        <View style={[styles.padContainer, styles.padDisabled]}>
          <Text style={styles.signedText}>Signature Captured</Text>
          <Text style={styles.signedSubtext}>
            Signed at {new Date().toLocaleTimeString()}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        ref={containerRef}
        style={styles.padContainer}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        {!hasSignature && strokes.length === 0 && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Sign here</Text>
            <Text style={styles.placeholderSubtext}>
              Draw your signature with your finger
            </Text>
          </View>
        )}
        <View style={styles.strokeContainer}>{renderStrokes()}</View>
        <View style={styles.signatureLine} />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClear}
          disabled={!hasSignature && strokes.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Clear signature"
        >
          <Text
            style={[
              styles.clearButtonText,
              !hasSignature && strokes.length === 0 && styles.buttonTextDisabled,
            ]}
          >
            Clear
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.confirmButton,
            !hasSignature && styles.buttonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!hasSignature}
          accessibilityRole="button"
          accessibilityLabel="Confirm signature"
        >
          <Text
            style={[
              styles.confirmButtonText,
              !hasSignature && styles.buttonTextDisabled,
            ]}
          >
            Confirm
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  padContainer: {
    height: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    borderStyle: 'dashed',
    overflow: 'hidden',
    position: 'relative',
  },
  padDisabled: {
    backgroundColor: '#F5F5F5',
    borderStyle: 'solid',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#BDBDBD',
    marginTop: 4,
  },
  strokeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  strokeLine: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#1A1A1A',
    borderRadius: 1.5,
    transformOrigin: 'left center',
  },
  signatureLine: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: '#BDBDBD',
  },
  signedText: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600',
  },
  signedSubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGETS.MINIMUM,
  },
  clearButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  confirmButton: {
    backgroundColor: '#1976D2',
  },
  buttonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextDisabled: {
    color: '#9E9E9E',
  },
});

export default SignaturePad;
