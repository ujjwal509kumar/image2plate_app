import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../supabaseClient'; // Import the Supabase client

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
    
        setLoading(true);
    
        try {
            // Sign up the user with email and password
            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });
    
            if (authError) throw authError; // Throw error if any during signup
    
            console.log('User signed up:', data?.user);
    
            if (!data?.user) throw new Error("User data is undefined after signup");
    
            // Insert the user's name, email, and id into the 'users' table
            const { error: dbError } = await supabase
                .from('users')
                .insert([{ id: data.user.id, email: data.user.email, name }]);
    
            if (dbError) throw dbError; // Handle any error during database insert
    
            alert('Account created successfully!');
    
            // Redirect user to login page after successful signup (optional)
            // router.push('/login');
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error:', error.message);
                alert('Error signing up: ' + error.message);
            } else {
                console.error('Unexpected error:', error);
                alert('An unexpected error occurred');
            }
        } finally {
            setLoading(false);
        }
    };
    

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Text style={styles.title}>Create Account</Text>

            <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
            />

            <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
                style={styles.button}
                onPress={handleSignup}
                disabled={loading}
            >
                <Text style={styles.buttonText}>{loading ? 'Signing Up...' : 'Sign Up'}</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text>Already have an account?</Text>
                <Link href="/">
                    <Text style={styles.link}> Login</Text>
                </Link>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
        textAlign: 'center',
    },
    input: {
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 20,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#4a90e2',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    link: {
        color: '#4a90e2',
        fontWeight: '600',
    },
});
