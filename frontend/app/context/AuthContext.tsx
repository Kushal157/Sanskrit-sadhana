"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    name: string;
    email: string;
    loginHistory: string[];
}

interface AuthContextType {
    user: User | null;
    login: (email: string, name?: string) => void;
    signup: (name: string, email: string) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('sanskrita_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = (email: string, name: string = "User") => {
        const timestamp = new Date().toLocaleString();
        const storedUser = localStorage.getItem('sanskrita_user');
        let history: string[] = [timestamp];

        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed.email === email) {
                history = [timestamp, ...(parsed.loginHistory || [])].slice(0, 10);
            }
        }

        const newUser = { name, email, loginHistory: history };
        setUser(newUser);
        localStorage.setItem('sanskrita_user', JSON.stringify(newUser));
    };

    const signup = (name: string, email: string) => {
        const timestamp = new Date().toLocaleString();
        const newUser = { name, email, loginHistory: [timestamp] };
        setUser(newUser);
        localStorage.setItem('sanskrita_user', JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('sanskrita_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
