package benchrun

import (
	"context"
	"crypto/md5"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
)

//go:embed frontend_hashes.json
var frontendHashes []byte

var FrontendHashesMap map[string]string

func init() {
	err := json.Unmarshal(frontendHashes, &FrontendHashesMap)
	if err != nil {
		panic(err)
	}
}

func RequestStaticFileHash(ctx context.Context, client http.Client, baseURL string, path string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", baseURL+"/"+path, nil)
	if err != nil {
		return "", err
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer closeBody(resp)

	h := md5.New()
	if _, err := io.Copy(h, resp.Body); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func closeBody(resp *http.Response) {
	if resp.Body != nil {
		_, _ = io.Copy(io.Discard, resp.Body)
		_ = resp.Body.Close()
	}
}
