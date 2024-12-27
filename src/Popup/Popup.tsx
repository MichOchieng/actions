import './Popup.css'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

import { useState, useEffect, useRef } from 'react'
import { BeatLoader } from 'react-spinners';

interface PageInfo {
  canonicalUrl: string | null;
  errorMessage: string | null;
  hasSitefinity: boolean;
  tab: chrome.tabs.Tab | null;
}

function Popup() {
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    canonicalUrl: null,
    errorMessage: null,
    hasSitefinity: false,
    tab: null
  });

  const [isLoading, setIsLoading] = useState(true);

  // Avoids stale closure in useEffect
  // pageInfo is updated in the useEffect ∴ can't use it directly in the sendMessage (pageInfo.tab.id)
  const tabIDRef = useRef<number | undefined>();


  useEffect(() => {
    async function getTabUrl(): Promise<string | null> {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab?.url) return null;
        tabIDRef.current = tab?.id;

        setPageInfo(prev => ({ ...prev, tab }));

        const url = new URL(tab.url);
        return `${url.protocol}//${url.hostname}`;
      } catch (error) {
        console.error('Get tab error:', error);
        return null;
      }
    }

    async function checkSitefinity(baseURL: string) {
      try {
        const response = await fetch(`${baseURL}/sitefinity`);

        if (!response.ok) {
          setPageInfo(prev => ({
            ...prev,
            errorMessage: 'Sitefinity CMS not found on this domain!'
          }));
          return;
        }

        setPageInfo(prev => ({ ...prev, hasSitefinity: true }));
      } catch (error) {
        console.error('Sitefinity check error:', error);
        setPageInfo(prev => ({
          ...prev,
          errorMessage: 'Failed to check for Sitefinity!'
        }));
      }
    }

    async function getCanonicalUrl() {
      try {
        if (!tabIDRef.current) return;

        const canonicalUrl = await chrome.tabs.sendMessage(
          tabIDRef.current,
          { type: 'GET_CANONICAL_URL' }
        );

        if (!canonicalUrl) {
          setPageInfo(prev => ({
            ...prev,
            errorMessage: 'No canonical URL found on this page!'
          }));
          return;
        }

        setPageInfo(prev => ({ ...prev, canonicalUrl }));
      } catch (error) {
        console.error('Canonical URL error:', error);
        setPageInfo(prev => ({
          ...prev,
          errorMessage: 'Failed to get canonical URL!'
        }));
      }
    }

    async function init() {
      try {
        const baseURL = await getTabUrl();
        if (!baseURL) {
          setPageInfo(prev => ({ ...prev, errorMessage: 'Failed to get tab URL!' }));
          setIsLoading(false);
          return;
        }

        await checkSitefinity(baseURL);
        await getCanonicalUrl();
        setIsLoading(false);
      } catch (error) {
        console.error('Init error:', error);
        setPageInfo(prev => ({ ...prev, errorMessage: 'Failed to initialize!' }));
        setIsLoading(false);
      }
    }

    init();
  }, []);


  return (
    <main className='h-[100vh] w-[100vw] flex flex-col justify-center items-center'>
      <Card className='w-[300px] h-fit min-h-[200px] mx-auto bg-transparent flex items-center flex-col gap-[1rem] text-white'>
        <CardHeader>
          <CardTitle className='text-center'><h1>Actions</h1></CardTitle>
        </CardHeader>
        {/* Main Content */}
        <CardContent className='flex flex-row gap-[1rem]'>
          {
            isLoading ? (
              // Loading state
              <>
                <BeatLoader color='#fff' loading={isLoading} />
              </>
            ) : (
              pageInfo.hasSitefinity ? (
                // Has Sitefinity CMS
                <>
                  <Button>Edit</Button>
                  <Button>Preview</Button>
                </>
              ) : (
                // No Sitefinity CMS
                <>
                  <Button disabled>Edit</Button>
                  <Button disabled>Preview</Button>
                </>
              )
            )
          }
        </CardContent>
        {/* Footer info */}
        <CardFooter>
          {isLoading ? <p>Checking page...</p> : (pageInfo.errorMessage ? <p>{pageInfo.errorMessage}</p> : null)}
        </CardFooter>
      </Card>
    </main>
  )
}

export default Popup