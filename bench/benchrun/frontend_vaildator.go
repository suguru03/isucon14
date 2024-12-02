package benchrun

import (
	"crypto/md5"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"io"
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

func GetHashFromStream(r io.Reader) (string, error) {
	h := md5.New()
	if _, err := io.Copy(h, r); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}
