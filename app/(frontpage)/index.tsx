import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../supabaseClient'; // Import the Supabase client

const { width } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // To capture errors
  const router = useRouter(); // To handle navigation

  const handleLogin = async () => {
    setLoading(true);
    setError(''); // Reset error message

    try {
      // Attempt to log in the user with email and password
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // If there's an error with authentication (wrong password, etc.), display it
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      if (data?.user) {
        router.push('/(dashboard)');
      } else {
        // Handle any unexpected result
        setError('Something went wrong. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      // Catch any other errors
      console.error('Error:', err);
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topImageContainer}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.topImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.innerContainer}>
        <Text style={styles.greeting}>Welcome Back</Text>

        {/* Display error message if login fails */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Logging In...' : 'Login'}
          </Text>
        </TouchableOpacity>
        <View style={styles.linksContainer}>
          <Link href="/forgot">
            <Text style={styles.link}>Forgot Password?</Text>
          </Link>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Link href="/signup">
            <Text style={[styles.link, { marginLeft: 5 }]}>Sign Up</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  topImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  topImage: {
    width: width * 0.5,
    height: width * 0.5,
  },
  innerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 30,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 25,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#4a90e2',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linksContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  link: {
    color: '#4a90e2',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});
