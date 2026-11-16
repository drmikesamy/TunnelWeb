import { mount } from 'svelte';
import '@fontsource/comic-neue';
import '@fontsource/pacifico';
import '@fontsource/lobster';
import '@fontsource/roboto';
import '@fontsource/source-code-pro';
import './theme.css';
import App from './App.svelte';
import { session } from '$lib/stores/session.svelte';

session.init(); // restore the saved profile and connect, or show sign-in
mount(App, { target: document.getElementById('app')! });
