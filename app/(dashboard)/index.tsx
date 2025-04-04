import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Image, 
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabaseClient';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [ipAddress, setIpAddress] = useState('');
  const [response, setResponse] = useState<{ detections: Array<{ class: string; confidence: number; bbox: any }> } | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const imageRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchUserDetails = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData?.session?.user?.id) {
          if (isMounted) {
            setLoading(false);
            router.replace('/(frontpage)');
          }
          return;
        }

        const userId = sessionData.session.user.id;
        
        const { data, error } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', userId)
          .single();

        if (isMounted) {
          setUser(error || !data ? { email: sessionData.session.user.email } : data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching user details:', err);
        if (isMounted) setLoading(false);
      }
    };

    fetchUserDetails();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Get image dimensions when an image is selected
  useEffect(() => {
    if (image) {
      Image.getSize(image, (width, height) => {
        setImageSize({ width, height });
      }, (error) => {
        console.error("Failed to get image size:", error);
      });
    }
  }, [image]);

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setResponse(null);
        setError(null);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setError('Failed to select image from gallery');
    }
  };

  const takePhoto = async () => {
    try {
      // Request camera permissions first
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Camera permission is required to take photos');
        return;
      }
      
      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setResponse(null);
        setError(null);
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      setError('Failed to take photo');
    }
  };

  const sendToBackend = async () => {
    if (!image || !ipAddress) {
      Alert.alert('Missing information', 'Please select an image and enter the backend IP address');
      return;
    }
    
    setProcessingImage(true);
    setError(null);
    
    const formData = new FormData();
    const imageFilename = image.split('/').pop() || 'photo.jpg';
    
    formData.append('file', {
      uri: image,
      name: imageFilename,
      type: 'image/jpeg',
    } as any);
    
    try {
      console.log(`Sending request to http://${ipAddress}:8000/detect`);
      const res = await axios.post(`http://${ipAddress}:8000/detect`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 seconds timeout
      });
      
      console.log("Response received:", JSON.stringify(res.data));
      
      if (res.data && typeof res.data === 'object') {
        // Ensure response has the expected structure
        if (!res.data.detections) {
          res.data.detections = [];
        }
        setResponse(res.data);
      } else {
        setError('Invalid response from server');
        console.error('Invalid response format:', res.data);
      }
    } catch (error: any) {
      console.error('Error sending image:', error);
      let errorMessage = 'Failed to connect to the server';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        errorMessage = `Server error: ${error.response.status}`;
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        errorMessage = 'No response from server';
      } else {
        // Something happened in setting up the request
        errorMessage = error.message || 'Connection error';
      }
      
      setError(errorMessage);
      Alert.alert('Connection Error', 
        `Failed to connect to the backend at ${ipAddress}:8000. Please check your IP address and ensure the server is running.`
      );
    } finally {
      setProcessingImage(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(frontpage)');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Calculate display image dimensions to maintain aspect ratio within the screen
  const calculateDisplayDimensions = () => {
    const containerWidth = width - 40; // Container width accounting for padding
    
    if (imageSize.width === 0 || imageSize.height === 0) {
      return { width: containerWidth, height: containerWidth };
    }
    
    const aspectRatio = imageSize.width / imageSize.height;
    return {
      width: containerWidth,
      height: containerWidth / aspectRatio
    };
  };

  // Scale bounding box coordinates from original image to display size
  const scaleBoundingBox = (bbox: any) => {
    const displayDims = calculateDisplayDimensions();
    const scaleX = displayDims.width / imageSize.width;
    const scaleY = displayDims.height / imageSize.height;
    
    return {
      x: bbox.x1 * scaleX,
      y: bbox.y1 * scaleY,
      width: (bbox.x2 - bbox.x1) * scaleX,
      height: (bbox.y2 - bbox.y1) * scaleY
    };
  };

  // Get color based on confidence
  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return '#4CAF50';
    if (confidence > 0.4) return '#FFC107';
    return '#F44336';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A5AE0" />
      </View>
    );
  }

  const displayDimensions = calculateDisplayDimensions();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.heading}>AI Object Detection</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FF5C5C" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.greeting}>{user?.name || 'User'}</Text>
            <Text style={styles.email}>{user?.email || 'Not available'}</Text>
          </View>
        </View>
        
        <View style={styles.inputContainer}>
          <Ionicons name="server-outline" size={20} color="#6A5AE0" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Enter Backend IP Address"
            value={ipAddress}
            onChangeText={setIpAddress}
            placeholderTextColor="#999" 
          />
        </View>
        
        <View style={styles.imageSection}>
          {image ? (
            <View style={styles.imageContainer}>
              <Image 
                ref={imageRef}
                source={{ uri: image }} 
                style={[styles.image, { width: displayDimensions.width, height: displayDimensions.height }]} 
              />
              
              {/* SVG overlay for bounding boxes */}
              {response && response.detections && response.detections.length > 0 && (
                <Svg 
                  style={StyleSheet.absoluteFill}
                  width={displayDimensions.width}
                  height={displayDimensions.height}
                >
                  {response.detections.map((detection, index) => {
                    const scaledBox = scaleBoundingBox(detection.bbox);
                    const color = getConfidenceColor(detection.confidence);
                    const confidence = Math.round(detection.confidence * 100);
                    
                    return (
                      <React.Fragment key={index}>
                        <Rect
                          x={scaledBox.x}
                          y={scaledBox.y}
                          width={scaledBox.width}
                          height={scaledBox.height}
                          strokeWidth={3}
                          stroke={color}
                          fill="none"
                        />
                        <SvgText
                          x={scaledBox.x + 5}
                          y={scaledBox.y - 5}
                          fontSize="14"
                          fill={color}
                          fontWeight="bold"
                          stroke="white"
                          strokeWidth={0.5}
                        >
                          {`${detection.class} (${confidence}%)`}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}
                </Svg>
              )}
              
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => {
                  setImage(null);
                  setResponse(null);
                }}
              >
                <Ionicons name="close-circle" size={24} color="#FF5C5C" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <MaterialIcons name="image" size={64} color="#ddd" />
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.galleryButton]} onPress={pickImage}>
            <Ionicons name="images-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.cameraButton]} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Camera</Text>
          </TouchableOpacity>
        </View>
        
        {image && (
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!ipAddress || processingImage) && styles.disabledButton
            ]} 
            onPress={sendToBackend}
            disabled={!ipAddress || processingImage}
          >
            {processingImage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="search-outline" size={20} color="#fff" />
                <Text style={styles.sendButtonText}>Detect Objects</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#FF5C5C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {response && (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Detection Results</Text>
            </View>
            <View style={styles.resultContent}>
              {response.detections && response.detections.length > 0 ? (
                response.detections.map((detection, index) => (
                  <View key={index} style={styles.detectionItem}>
                    <View style={styles.detectionHeader}>
                      <Text style={styles.detectionClass}>{detection.class}</Text>
                      <View style={styles.confidenceContainer}>
                        <Text style={styles.confidenceText}>
                          {Math.round(detection.confidence * 100)}%
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.confidenceBar}>
                      <View 
                        style={[
                          styles.confidenceFill, 
                          { width: `${detection.confidence * 100}%` },
                          { backgroundColor: detection.confidence > 0.7 ? '#4CAF50' : 
                                            detection.confidence > 0.4 ? '#FFC107' : '#F44336' }
                        ]} 
                      />
                    </View>
                    
                    <View style={styles.bboxInfo}>
                      <Text style={styles.bboxText}>
                        Coordinates: [{Math.round(detection.bbox.x1)}, {Math.round(detection.bbox.y1)}] 
                        to [{Math.round(detection.bbox.x2)}, {Math.round(detection.bbox.y2)}]
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDetectionText}>No objects detected in the image</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#FF5C5C',
    fontWeight: '500',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6A5AE0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  profileInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    borderRadius: 16,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 14,
    padding: 2,
  },
  placeholderContainer: {
    width: width - 40,
    height: 200,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    width: '48%',
  },
  galleryButton: {
    backgroundColor: '#6A5AE0',
  },
  cameraButton: {
    backgroundColor: '#FF8E3C',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: '#B0BEC5',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    color: '#D32F2F',
    marginLeft: 8,
    flex: 1,
  },
  resultContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  resultHeader: {
    backgroundColor: '#6A5AE0',
    padding: 16,
  },
  resultTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultContent: {
    padding: 16,
  },
  detectionItem: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 16,
  },
  detectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detectionClass: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize',
  },
  confidenceContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  confidenceText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
  },
  bboxInfo: {
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 8,
  },
  bboxText: {
    color: '#757575',
    fontSize: 12,
  },
  noDetectionText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginVertical: 20,
  },
});