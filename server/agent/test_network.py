#!/usr/bin/env python3
"""
Comprehensive network diagnostic for Deepgram API
"""
import asyncio
import socket
import requests
from urllib.parse import urlparse
import os
from dotenv import load_dotenv

load_dotenv()

def test_dns(hostname):
    """Test if DNS resolution works for Deepgram"""
    print(f"\n🌐 Testing DNS Resolution for {hostname}...")
    try:
        ip = socket.gethostbyname(hostname)
        print(f"   ✅ Resolved to: {ip}")
        return True
    except socket.gaierror as e:
        print(f"   ❌ DNS Resolution Failed: {e}")
        return False

def test_tcp_connection(hostname, port=443):
    """Test if we can establish TCP connection"""
    print(f"\n🔌 Testing TCP Connection to {hostname}:{port}...")
    try:
        sock = socket.create_connection((hostname, port), timeout=10)
        sock.close()
        print(f"   ✅ TCP Connection Successful")
        return True
    except Exception as e:
        print(f"   ❌ TCP Connection Failed: {e}")
        return False

def test_http_request(url):
    """Test basic HTTP GET request"""
    print(f"\n🌍 Testing HTTPS Request to {url}...")
    try:
        response = requests.get(url, timeout=10)
        print(f"   ✅ Response Status: {response.status_code}")
        return True
    except Exception as e:
        print(f"   ❌ HTTPS Request Failed: {e}")
        return False

def test_deepgram_api():
    """Test Deepgram API authentication"""
    print(f"\n🎤 Testing Deepgram API Authentication...")
    api_key = os.getenv("DEEPGRAM_API_KEY")
    
    if not api_key:
        print("   ❌ No API key found")
        return False
    
    try:
        headers = {
            "Authorization": f"Token {api_key}",
            "Content-Type": "application/json"
        }
        # Test with a simple API endpoint
        response = requests.get(
            "https://api.deepgram.com/v1/projects",
            headers=headers,
            timeout=10
        )
        print(f"   ✅ API Response: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ API Key Valid!")
            return True
        else:
            print(f"   ⚠️  Unexpected status: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ API Test Failed: {e}")
        return False

def test_groq_api():
    """Test Groq API authentication"""
    print(f"\n🤖 Testing Groq API Authentication...")
    api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key:
        print("   ❌ No API key found")
        return False
    
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        # Test with models endpoint
        response = requests.get(
            "https://api.groq.com/openai/v1/models",
            headers=headers,
            timeout=10
        )
        print(f"   ✅ API Response: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ API Key Valid!")
            return True
        else:
            print(f"   ⚠️  Unexpected status: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ API Test Failed: {e}")
        return False

def main():
    print("="*70)
    print("🔍 NETWORK DIAGNOSTICS FOR VOICE AGENT")
    print("="*70)
    
    results = {}
    
    # Test 1: Basic Internet Connectivity
    print("\n📡 STEP 1: Basic Internet Connectivity")
    results['google_dns'] = test_dns("google.com")
    
    # Test 2: Deepgram DNS
    print("\n📡 STEP 2: Deepgram DNS Resolution")
    results['deepgram_dns'] = test_dns("api.deepgram.com")
    
    # Test 3: Deepgram TCP Connection
    print("\n📡 STEP 3: Deepgram TCP Connection")
    results['deepgram_tcp'] = test_tcp_connection("api.deepgram.com", 443)
    
    # Test 4: Deepgram HTTPS
    print("\n📡 STEP 4: Deepgram HTTPS Request")
    results['deepgram_https'] = test_http_request("https://api.deepgram.com")
    
    # Test 5: Deepgram API Authentication
    print("\n📡 STEP 5: Deepgram API Authentication")
    results['deepgram_api'] = test_deepgram_api()
    
    # Test 6: Groq API
    print("\n📡 STEP 6: Groq API Authentication")
    results['groq_api'] = test_groq_api()
    
    # Test 7: LiveKit
    print("\n📡 STEP 7: LiveKit Connection")
    livekit_url = os.getenv("LIVEKIT_URL", "")
    if livekit_url:
        hostname = urlparse(livekit_url).hostname
        if hostname:
            results['livekit_dns'] = test_dns(hostname)
            results['livekit_tcp'] = test_tcp_connection(hostname, 443)
    
    # Summary
    print("\n")
    print("="*70)
    print("📊 DIAGNOSTIC SUMMARY")
    print("="*70)
    
    for test, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test}")
    
    print("\n")
    
    # Diagnosis
    if not results.get('google_dns'):
        print("🚨 CRITICAL: No internet connection detected!")
    elif not results.get('deepgram_dns'):
        print("🚨 ISSUE: Cannot resolve Deepgram domain (DNS issue)")
    elif not results.get('deepgram_tcp'):
        print("🚨 ISSUE: Cannot connect to Deepgram (Firewall/Network blocking)")
    elif not results.get('deepgram_api'):
        print("⚠️  WARNING: Deepgram API authentication issue or network timeout")
    elif all(results.values()):
        print("✅ ALL SYSTEMS OPERATIONAL!")
    else:
        print("⚠️  Some systems have issues, check details above")

if __name__ == "__main__":
    main()
